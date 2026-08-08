"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { getEffectiveStatus, computeCascade } from "@/lib/planning";
import { stageFormSchema, taskFormSchema, bulkPlanningSchema } from "@/lib/validations/planejamento";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function applyCascadeForTask(tx: TxClient, workId: string, changedTaskId: string) {
  const [tasks, dependencies] = await Promise.all([
    tx.planningTask.findMany({
      where: { workId },
      select: { id: true, dataInicioPrevista: true, dataFimPrevista: true },
    }),
    tx.planningDependency.findMany({
      where: { predecessorTask: { workId }, successorTask: { workId } },
      select: { predecessorTaskId: true, successorTaskId: true, lagDias: true },
    }),
  ]);

  const updates = computeCascade(tasks, dependencies, changedTaskId);
  for (const [taskId, dates] of updates) {
    await tx.planningTask.update({ where: { id: taskId }, data: dates });
  }
  return updates;
}

export async function listStagesForAllWorks() {
  const stages = await prisma.planningStage.findMany({
    include: { tasks: { orderBy: { ordem: "asc" }, select: { id: true, codigo: true, nome: true } } },
    orderBy: { ordem: "asc" },
  });

  const map: Record<string, { id: string; codigo: string | null; nome: string; tasks: { id: string; codigo: string | null; nome: string }[] }[]> = {};
  for (const stage of stages) {
    const list = map[stage.workId] ?? [];
    list.push({ id: stage.id, codigo: stage.codigo, nome: stage.nome, tasks: stage.tasks });
    map[stage.workId] = list;
  }
  return map;
}

export async function listOverdueTasks(workId: string) {
  return prisma.planningTask.findMany({
    where: { workId, status: "ATRASADA" },
    include: { stage: true },
    orderBy: { dataFimPrevista: "asc" },
  });
}

export async function listUpcomingTasks(workId: string) {
  return prisma.planningTask.findMany({
    where: { workId, status: { in: ["NAO_INICIADA", "EM_ANDAMENTO"] } },
    include: { stage: true },
    orderBy: { dataInicioPrevista: "asc" },
    take: 5,
  });
}

export async function listStagesWithTasks(workId: string) {
  const stages = await prisma.planningStage.findMany({
    where: { workId },
    include: {
      tasks: {
        include: { predecessors: { include: { predecessorTask: { select: { id: true, codigo: true, nome: true } } } } },
        orderBy: { ordem: "asc" },
      },
    },
    orderBy: { ordem: "asc" },
  });

  const toUpdate: { id: string; status: ReturnType<typeof getEffectiveStatus> }[] = [];
  const healed = stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) => {
      const effectiveStatus = getEffectiveStatus({
        percentualExecutado: Number(task.percentualExecutado),
        dataFimPrevista: task.dataFimPrevista,
      });
      if (effectiveStatus !== task.status) {
        toUpdate.push({ id: task.id, status: effectiveStatus });
      }
      return { ...task, status: effectiveStatus };
    }),
  }));

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((item) => prisma.planningTask.update({ where: { id: item.id }, data: { status: item.status } })),
    );
  }

  return healed;
}

export async function createStage(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = stageFormSchema.safeParse({
    workId: formData.get("workId"),
    codigo: formData.get("codigo") ?? undefined,
    nome: formData.get("nome"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }

  const count = await prisma.planningStage.count({ where: { workId: parsed.data.workId } });
  const codigo = parsed.data.codigo || String(count + 1).padStart(2, "0");
  await prisma.planningStage.create({
    data: { workId: parsed.data.workId, codigo, nome: parsed.data.nome, ordem: count },
  });

  revalidatePath(`/obras/${parsed.data.workId}/planejamento`);
  return undefined;
}

export async function deleteStage(stageId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.planningStage.delete({ where: { id: stageId } });
  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function createTask(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = taskFormSchema.safeParse({
    workId: formData.get("workId"),
    stageId: formData.get("stageId"),
    codigo: formData.get("codigo") ?? undefined,
    nome: formData.get("nome"),
    dataInicioPrevista: formData.get("dataInicioPrevista"),
    dataFimPrevista: formData.get("dataFimPrevista"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const [count, stage] = await Promise.all([
    prisma.planningTask.count({ where: { stageId: data.stageId } }),
    prisma.planningStage.findUnique({ where: { id: data.stageId }, select: { codigo: true } }),
  ]);
  const codigo = data.codigo || `${stage?.codigo ?? ""}.${String(count + 1).padStart(2, "0")}`;
  await prisma.planningTask.create({
    data: {
      workId: data.workId,
      stageId: data.stageId,
      codigo,
      nome: data.nome,
      ordem: count,
      dataInicioPrevista: new Date(data.dataInicioPrevista),
      dataFimPrevista: new Date(data.dataFimPrevista),
    },
  });

  revalidatePath(`/obras/${data.workId}/planejamento`);
  return undefined;
}

export async function deleteTask(taskId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.planningTask.delete({ where: { id: taskId } });
  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function updatePlanningTaskDates(taskId: string, workId: string, start: string, end: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.$transaction(async (tx) => {
    await tx.planningTask.update({
      where: { id: taskId },
      data: { dataInicioPrevista: new Date(start), dataFimPrevista: new Date(end) },
    });
    await applyCascadeForTask(tx, workId, taskId);
  });

  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function listTasksForDependencyPicker(workId: string) {
  return prisma.planningTask.findMany({
    where: { workId },
    include: { stage: true },
    orderBy: [{ stage: { ordem: "asc" } }, { ordem: "asc" }],
  });
}

export async function addPlanningDependency(
  predecessorTaskId: string,
  successorTaskId: string,
  workId: string,
  lagDias = 0,
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  if (predecessorTaskId === successorTaskId) {
    throw new Error("Uma atividade não pode ser predecessora dela mesma.");
  }

  await prisma.planningDependency.create({
    data: { predecessorTaskId, successorTaskId, lagDias },
  });

  await prisma.$transaction(async (tx) => {
    await applyCascadeForTask(tx, workId, predecessorTaskId);
  });

  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function removePlanningDependency(dependencyId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.planningDependency.delete({ where: { id: dependencyId } });
  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function importPlanningBulk(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  let rowsParsed: unknown;
  try {
    rowsParsed = JSON.parse(String(formData.get("rowsJson") ?? "[]"));
  } catch {
    return "Linhas inválidas.";
  }

  const parsed = bulkPlanningSchema.safeParse({ workId: formData.get("workId"), rows: rowsParsed });
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
    if (!row.dataInicioPrevista || !row.dataFimPrevista) {
      return `Informe início e fim da atividade "${row.nome}".`;
    }
  }

  await prisma.$transaction(async (tx) => {
    const stageIdMap = new Map<string, string>();
    const stageCodigoMap = new Map<string, string>();
    const existingStageCount = await tx.planningStage.count({ where: { workId: data.workId } });

    for (const [index, row] of etapaRows.entries()) {
      const codigo = row.codigo || String(existingStageCount + index + 1).padStart(2, "0");
      const created = await tx.planningStage.create({
        data: { workId: data.workId, codigo, nome: row.nome, ordem: existingStageCount + index },
      });
      stageIdMap.set(row.clientId, created.id);
      stageCodigoMap.set(row.clientId, codigo);
    }

    const taskIdMap = new Map<string, string>();
    const taskCountByStage = new Map<string, number>();

    for (const row of atividadeRows) {
      const stageId = stageIdMap.get(row.parentClientId!);
      if (!stageId) continue;

      const countSoFar = taskCountByStage.get(stageId) ?? (await tx.planningTask.count({ where: { stageId } }));
      const stageCodigo = stageCodigoMap.get(row.parentClientId!) ?? "";
      const codigo = row.codigo || `${stageCodigo}.${String(countSoFar + 1).padStart(2, "0")}`;

      const created = await tx.planningTask.create({
        data: {
          workId: data.workId,
          stageId,
          codigo,
          nome: row.nome,
          ordem: countSoFar,
          dataInicioPrevista: new Date(row.dataInicioPrevista!),
          dataFimPrevista: new Date(row.dataFimPrevista!),
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
        await tx.planningDependency.create({
          data: { predecessorTaskId: predecessorId, successorTaskId: successorId },
        });
      }
    }
  });

  revalidatePath(`/obras/${data.workId}/planejamento`);
  redirect(`/obras/${data.workId}/planejamento`);
}
