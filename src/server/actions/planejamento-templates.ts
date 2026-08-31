"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { assertModuleWrite } from "@/server/actions/permissions";
import { createTemplateSchema, applyTemplateSchema, saveAsTemplateSchema } from "@/lib/validations/planejamento-templates";

export async function listPlanningTemplates() {
  const templates = await prisma.planningTemplate.findMany({
    include: {
      createdBy: { select: { name: true } },
      stages: { include: { _count: { select: { tasks: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return templates.map((t) => ({
    id: t.id,
    nome: t.nome,
    descricao: t.descricao,
    createdByName: t.createdBy.name,
    createdAt: t.createdAt,
    stageCount: t.stages.length,
    taskCount: t.stages.reduce((sum, s) => sum + s._count.tasks, 0),
  }));
}

export async function getPlanningTemplateForEdit(templateId: string) {
  const template = await prisma.planningTemplate.findUnique({
    where: { id: templateId },
    include: {
      stages: {
        include: { tasks: { include: { predecessors: true }, orderBy: { ordem: "asc" } } },
        orderBy: { ordem: "asc" },
      },
    },
  });
  if (!template) return null;

  const rows = [
    ...template.stages.map((stage) => ({
      clientId: stage.id,
      tipo: "ETAPA" as const,
      parentClientId: "",
      codigo: stage.codigo ?? "",
      nome: stage.nome,
      offsetInicioDias: undefined,
      duracaoDias: undefined,
      predecessorClientIds: [],
    })),
    ...template.stages.flatMap((stage) =>
      stage.tasks.map((task) => ({
        clientId: task.id,
        tipo: "ATIVIDADE" as const,
        parentClientId: stage.id,
        codigo: task.codigo ?? "",
        nome: task.nome,
        offsetInicioDias: task.offsetInicioDias,
        duracaoDias: task.duracaoDias,
        predecessorClientIds: task.predecessors.map((dep) => dep.predecessorTaskId),
      })),
    ),
  ];

  return { id: template.id, nome: template.nome, descricao: template.descricao, rows };
}

export async function deletePlanningTemplate(templateId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("planejamentoSomenteLeitura");

  await prisma.planningTemplate.delete({ where: { id: templateId } });
  revalidatePath("/planejamento-templates");
}

export async function createPlanningTemplate(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("planejamentoSomenteLeitura");

  let rowsParsed: unknown;
  try {
    rowsParsed = JSON.parse(String(formData.get("rowsJson") ?? "[]"));
  } catch {
    return "Linhas inválidas.";
  }

  const parsed = createTemplateSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") ?? undefined,
    rows: rowsParsed,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const etapaRows = data.rows.filter((r) => r.tipo === "ETAPA");
  const atividadeRows = data.rows.filter((r) => r.tipo === "ATIVIDADE");

  for (const row of atividadeRows) {
    if (!row.parentClientId) {
      return `A atividade "${row.nome}" precisa estar dentro de uma etapa.`;
    }
    if (row.offsetInicioDias === undefined || row.duracaoDias === undefined) {
      return `Informe o dia de início e a duração da atividade "${row.nome}".`;
    }
  }

  await prisma.$transaction(async (tx) => {
    const template = await tx.planningTemplate.create({
      data: { nome: data.nome, descricao: data.descricao || null, createdById: session.user.id },
    });

    const stageIdMap = new Map<string, string>();
    for (const [index, row] of etapaRows.entries()) {
      const created = await tx.planningTemplateStage.create({
        data: {
          templateId: template.id,
          codigo: row.codigo || String(index + 1).padStart(2, "0"),
          nome: row.nome,
          ordem: index,
        },
      });
      stageIdMap.set(row.clientId, created.id);
    }

    const taskIdMap = new Map<string, string>();
    const taskCountByStage = new Map<string, number>();
    for (const row of atividadeRows) {
      const stageId = stageIdMap.get(row.parentClientId!);
      if (!stageId) continue;
      const countSoFar = taskCountByStage.get(stageId) ?? 0;
      const created = await tx.planningTemplateTask.create({
        data: {
          templateStageId: stageId,
          codigo: row.codigo || undefined,
          nome: row.nome,
          ordem: countSoFar,
          offsetInicioDias: row.offsetInicioDias!,
          duracaoDias: row.duracaoDias!,
        },
      });
      taskIdMap.set(row.clientId, created.id);
      taskCountByStage.set(stageId, countSoFar + 1);
    }

    for (const row of atividadeRows) {
      const successorId = taskIdMap.get(row.clientId);
      if (!successorId || !row.predecessorClientIds) continue;
      for (const predecessorClientId of row.predecessorClientIds) {
        const predecessorId = taskIdMap.get(predecessorClientId);
        if (!predecessorId) continue;
        await tx.planningTemplateDependency.create({
          data: { predecessorTaskId: predecessorId, successorTaskId: successorId },
        });
      }
    }
  });

  revalidatePath("/planejamento-templates");
  redirect("/planejamento-templates");
}

export async function updatePlanningTemplate(templateId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("planejamentoSomenteLeitura");

  let rowsParsed: unknown;
  try {
    rowsParsed = JSON.parse(String(formData.get("rowsJson") ?? "[]"));
  } catch {
    return "Linhas inválidas.";
  }

  const parsed = createTemplateSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") ?? undefined,
    rows: rowsParsed,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const etapaRows = data.rows.filter((r) => r.tipo === "ETAPA");
  const atividadeRows = data.rows.filter((r) => r.tipo === "ATIVIDADE");

  for (const row of atividadeRows) {
    if (!row.parentClientId) {
      return `A atividade "${row.nome}" precisa estar dentro de uma etapa.`;
    }
    if (row.offsetInicioDias === undefined || row.duracaoDias === undefined) {
      return `Informe o dia de início e a duração da atividade "${row.nome}".`;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.planningTemplate.update({
      where: { id: templateId },
      data: { nome: data.nome, descricao: data.descricao || null },
    });

    // Recria a estrutura do zero — mais simples e robusto do que tentar
    // fazer diff de etapas/atividades/dependências alteradas, removidas e
    // adicionadas. As dependências e tasks caem em cascata (onDelete: Cascade).
    await tx.planningTemplateStage.deleteMany({ where: { templateId } });

    const stageIdMap = new Map<string, string>();
    for (const [index, row] of etapaRows.entries()) {
      const created = await tx.planningTemplateStage.create({
        data: {
          templateId,
          codigo: row.codigo || String(index + 1).padStart(2, "0"),
          nome: row.nome,
          ordem: index,
        },
      });
      stageIdMap.set(row.clientId, created.id);
    }

    const taskIdMap = new Map<string, string>();
    const taskCountByStage = new Map<string, number>();
    for (const row of atividadeRows) {
      const stageId = stageIdMap.get(row.parentClientId!);
      if (!stageId) continue;
      const countSoFar = taskCountByStage.get(stageId) ?? 0;
      const created = await tx.planningTemplateTask.create({
        data: {
          templateStageId: stageId,
          codigo: row.codigo || undefined,
          nome: row.nome,
          ordem: countSoFar,
          offsetInicioDias: row.offsetInicioDias!,
          duracaoDias: row.duracaoDias!,
        },
      });
      taskIdMap.set(row.clientId, created.id);
      taskCountByStage.set(stageId, countSoFar + 1);
    }

    for (const row of atividadeRows) {
      const successorId = taskIdMap.get(row.clientId);
      if (!successorId || !row.predecessorClientIds) continue;
      for (const predecessorClientId of row.predecessorClientIds) {
        const predecessorId = taskIdMap.get(predecessorClientId);
        if (!predecessorId) continue;
        await tx.planningTemplateDependency.create({
          data: { predecessorTaskId: predecessorId, successorTaskId: successorId },
        });
      }
    }
  });

  revalidatePath("/planejamento-templates");
  redirect("/planejamento-templates");
}

export async function saveWorkPlanningAsTemplate(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("planejamentoSomenteLeitura");

  const parsed = saveAsTemplateSchema.safeParse({
    workId: formData.get("workId"),
    nome: formData.get("nome"),
    descricao: formData.get("descricao") ?? undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const stages = await prisma.planningStage.findMany({
    where: { workId: data.workId },
    include: { tasks: { include: { predecessors: true }, orderBy: { ordem: "asc" } } },
    orderBy: { ordem: "asc" },
  });

  const allTasks = stages.flatMap((s) => s.tasks);
  if (stages.length === 0) {
    return "Esta obra ainda não tem etapas para salvar como template.";
  }

  const dates = [
    ...allTasks.map((t) => t.dataInicioPrevista.getTime()),
    ...stages.filter((s) => s.tasks.length === 0 && s.dataInicioPrevista).map((s) => s.dataInicioPrevista!.getTime()),
  ];
  const day0 = new Date(dates.length > 0 ? Math.min(...dates) : Date.now());

  await prisma.$transaction(async (tx) => {
    const template = await tx.planningTemplate.create({
      data: { nome: data.nome, descricao: data.descricao || null, createdById: session.user.id },
    });

    const stageIdMap = new Map<string, string>();
    for (const stage of stages) {
      // Etapa "solta" (sem nenhuma atividade) preserva seu próprio prazo no template, do mesmo
      // jeito que uma atividade preserva offsetInicioDias/duracaoDias — ver hasAnyTaskInSubtree.
      const isSolo = stage.tasks.length === 0 && stage.dataInicioPrevista && stage.dataFimPrevista;
      const created = await tx.planningTemplateStage.create({
        data: {
          templateId: template.id,
          codigo: stage.codigo,
          nome: stage.nome,
          ordem: stage.ordem,
          offsetInicioDias: isSolo ? differenceInCalendarDays(stage.dataInicioPrevista!, day0) : null,
          duracaoDias: isSolo ? differenceInCalendarDays(stage.dataFimPrevista!, stage.dataInicioPrevista!) + 1 : null,
        },
      });
      stageIdMap.set(stage.id, created.id);
    }

    const taskIdMap = new Map<string, string>();
    for (const stage of stages) {
      const templateStageId = stageIdMap.get(stage.id)!;
      for (const task of stage.tasks) {
        const offsetInicioDias = differenceInCalendarDays(task.dataInicioPrevista, day0);
        const duracaoDias = differenceInCalendarDays(task.dataFimPrevista, task.dataInicioPrevista) + 1;
        const created = await tx.planningTemplateTask.create({
          data: {
            templateStageId,
            codigo: task.codigo,
            nome: task.nome,
            ordem: task.ordem,
            offsetInicioDias,
            duracaoDias,
          },
        });
        taskIdMap.set(task.id, created.id);
      }
    }

    for (const stage of stages) {
      for (const task of stage.tasks) {
        const successorId = taskIdMap.get(task.id);
        if (!successorId) continue;
        for (const dep of task.predecessors) {
          const predecessorId = taskIdMap.get(dep.predecessorTaskId);
          if (!predecessorId) continue;
          await tx.planningTemplateDependency.create({
            data: { predecessorTaskId: predecessorId, successorTaskId: successorId, lagDias: dep.lagDias },
          });
        }
      }
    }
  });

  revalidatePath("/planejamento-templates");
  return undefined;
}

export async function applyPlanningTemplate(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("planejamentoSomenteLeitura");

  const parsed = applyTemplateSchema.safeParse({
    workId: formData.get("workId"),
    templateId: formData.get("templateId"),
    dataInicio: formData.get("dataInicio"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const template = await prisma.planningTemplate.findUnique({
    where: { id: data.templateId },
    include: {
      stages: {
        include: { tasks: { include: { predecessors: true }, orderBy: { ordem: "asc" } } },
        orderBy: { ordem: "asc" },
      },
    },
  });
  if (!template) {
    return "Template não encontrado.";
  }

  const startDate = new Date(`${data.dataInicio}T00:00:00.000Z`);

  await prisma.$transaction(async (tx) => {
    const stageIdMap = new Map<string, string>();
    for (const stage of template.stages) {
      const hasTiming = stage.offsetInicioDias !== null && stage.duracaoDias !== null;
      const dataInicioPrevista = hasTiming ? addDays(startDate, stage.offsetInicioDias!) : undefined;
      const dataFimPrevista = hasTiming ? addDays(dataInicioPrevista!, stage.duracaoDias! - 1) : undefined;
      const created = await tx.planningStage.create({
        data: {
          workId: data.workId,
          codigo: stage.codigo,
          nome: stage.nome,
          ordem: stage.ordem,
          dataInicioPrevista,
          dataFimPrevista,
        },
      });
      stageIdMap.set(stage.id, created.id);
    }

    const taskIdMap = new Map<string, string>();
    for (const stage of template.stages) {
      const realStageId = stageIdMap.get(stage.id)!;
      for (const task of stage.tasks) {
        const dataInicioPrevista = addDays(startDate, task.offsetInicioDias);
        const dataFimPrevista = addDays(dataInicioPrevista, task.duracaoDias - 1);
        const created = await tx.planningTask.create({
          data: {
            workId: data.workId,
            stageId: realStageId,
            codigo: task.codigo,
            nome: task.nome,
            ordem: task.ordem,
            dataInicioPrevista,
            dataFimPrevista,
          },
        });
        taskIdMap.set(task.id, created.id);
      }
    }

    for (const stage of template.stages) {
      for (const task of stage.tasks) {
        const successorId = taskIdMap.get(task.id);
        if (!successorId) continue;
        for (const dep of task.predecessors) {
          const predecessorId = taskIdMap.get(dep.predecessorTaskId);
          if (!predecessorId) continue;
          await tx.planningDependency.create({
            data: { predecessorTaskId: predecessorId, successorTaskId: successorId, lagDias: dep.lagDias },
          });
        }
      }
    }
  });

  revalidatePath(`/obras/${data.workId}/planejamento`);
  redirect(`/obras/${data.workId}/planejamento`);
}
