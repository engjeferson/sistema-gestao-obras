"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { getEffectiveStatus, computeCascade } from "@/lib/planning";
import { stageFormSchema, taskFormSchema, bulkPlanningSchema } from "@/lib/validations/planejamento";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Próxima posição (0-based) pra uma nova etapa/sub, entre as etapas/subs que já existem sob `parentId`. */
async function nextStageOrdem(client: TxClient, workId: string, parentId: string | null) {
  return client.planningStage.count({ where: { workId, parentId } });
}

/**
 * Próxima posição (0-based) pra um novo filho direto de `parentStageId` (sub OU item),
 * contando os dois tipos juntos — é o que garante que a numeração (calculada por posição,
 * ver `assignCodes`) fique sequencial mesmo intercalando subs e itens.
 */
async function nextChildOrdem(client: TxClient, workId: string, parentStageId: string) {
  const [childStageCount, directItemCount] = await Promise.all([
    client.planningStage.count({ where: { workId, parentId: parentStageId } }),
    client.planningTask.count({ where: { stageId: parentStageId } }),
  ]);
  return childStageCount + directItemCount;
}

type TaskNode = { id: string; ordem: number; codigo: string | null; [key: string]: unknown };
type StageNode = { id: string; ordem: number; codigo: string | null; tasks: TaskNode[]; children: StageNode[]; [key: string]: unknown };

/**
 * Calcula o ID (1, 1.1, 1.1.1...) de cada etapa/sub/item a partir da posição real na árvore
 * (`ordem`), não de um valor gravado — garante que o ID esteja sempre presente, em sequência
 * e sem buracos, inclusive depois de mover/excluir itens.
 */
function assignChildCodes(node: StageNode) {
  const combined = [
    ...node.children.map((c) => ({ kind: "stage" as const, ordem: c.ordem, ref: c })),
    ...node.tasks.map((t) => ({ kind: "task" as const, ordem: t.ordem, ref: t })),
  ].sort((a, b) => a.ordem - b.ordem);

  combined.forEach((entry, index) => {
    const code = `${node.codigo}.${index + 1}`;
    entry.ref.codigo = code;
    if (entry.kind === "stage") assignChildCodes(entry.ref);
  });
}

function assignCodes(roots: StageNode[]) {
  const sorted = [...roots].sort((a, b) => a.ordem - b.ordem);
  sorted.forEach((root, index) => {
    root.codigo = String(index + 1);
    assignChildCodes(root);
  });
}

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

export type StageTreeNode = Awaited<ReturnType<typeof listStagesWithTasks>>[number];

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
  const healedTasksByStage = new Map(
    stages.map((stage) => [
      stage.id,
      stage.tasks.map((task) => {
        const effectiveStatus = getEffectiveStatus({
          percentualExecutado: Number(task.percentualExecutado),
          dataFimPrevista: task.dataFimPrevista,
        });
        if (effectiveStatus !== task.status) {
          toUpdate.push({ id: task.id, status: effectiveStatus });
        }
        return { ...task, status: effectiveStatus };
      }),
    ]),
  );

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((item) => prisma.planningTask.update({ where: { id: item.id }, data: { status: item.status } })),
    );
  }

  // Monta a árvore em memória (profundidade livre) a partir da lista plana.
  type Node = (typeof stages)[number] & { tasks: NonNullable<ReturnType<typeof healedTasksByStage.get>>; children: Node[] };
  const nodeById = new Map<string, Node>();
  for (const stage of stages) {
    nodeById.set(stage.id, { ...stage, tasks: healedTasksByStage.get(stage.id) ?? [], children: [] });
  }
  const roots: Node[] = [];
  for (const stage of stages) {
    const node = nodeById.get(stage.id)!;
    if (stage.parentId) {
      nodeById.get(stage.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  assignCodes(roots as unknown as StageNode[]);

  // Os `predecessors[].predecessorTask.codigo` vieram de um select à parte (não fazem parte da
  // árvore acima), então ficaram com o código antigo/cru do banco — corrige pelo código já calculado.
  const codeByTaskId = new Map<string, string>();
  (function collectCodes(nodes: Node[]) {
    for (const n of nodes) {
      for (const t of n.tasks) if (t.codigo) codeByTaskId.set(t.id, t.codigo);
      collectCodes(n.children);
    }
  })(roots);
  (function patchPredecessorCodes(nodes: Node[]) {
    for (const n of nodes) {
      for (const t of n.tasks) {
        for (const dep of t.predecessors) {
          const code = codeByTaskId.get(dep.predecessorTask.id);
          if (code) dep.predecessorTask.codigo = code;
        }
      }
      patchPredecessorCodes(n.children);
    }
  })(roots);

  return roots;
}

export async function listTasksForDependencyPicker(workId: string) {
  const roots = await listStagesWithTasks(workId);

  function flatten(nodes: StageTreeNode[]): { id: string; codigo: string | null; nome: string }[] {
    return nodes.flatMap((node) => [
      ...node.tasks.map((task) => ({ id: task.id, codigo: task.codigo, nome: task.nome })),
      ...flatten(node.children),
    ]);
  }
  return flatten(roots);
}

export async function createStage(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = stageFormSchema.safeParse({
    workId: formData.get("workId"),
    parentId: formData.get("parentId") || undefined,
    nome: formData.get("nome"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const parentId = data.parentId ?? null;

  const ordem = parentId ? await nextChildOrdem(prisma, data.workId, parentId) : await nextStageOrdem(prisma, data.workId, null);
  await prisma.planningStage.create({
    data: { workId: data.workId, parentId, nome: data.nome, ordem },
  });

  revalidatePath(`/obras/${data.workId}/planejamento`);
  return undefined;
}

export async function updateStageName(stageId: string, workId: string, nome: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const trimmed = nome.trim();
  if (!trimmed) return;

  await prisma.planningStage.update({ where: { id: stageId }, data: { nome: trimmed } });
  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function deleteStage(stageId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.planningStage.delete({ where: { id: stageId } });
  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function moveStage(stageId: string, workId: string, direction: "up" | "down") {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const stage = await prisma.planningStage.findUniqueOrThrow({ where: { id: stageId } });
  const siblings = await prisma.planningStage.findMany({
    where: { workId, parentId: stage.parentId },
    orderBy: { ordem: "asc" },
  });

  const index = siblings.findIndex((s) => s.id === stageId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) return;

  const a = siblings[index];
  const b = siblings[swapIndex];
  await prisma.$transaction([
    prisma.planningStage.update({ where: { id: a.id }, data: { ordem: b.ordem } }),
    prisma.planningStage.update({ where: { id: b.id }, data: { ordem: a.ordem } }),
  ]);

  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function createTask(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = taskFormSchema.safeParse({
    workId: formData.get("workId"),
    stageId: formData.get("stageId"),
    nome: formData.get("nome"),
    dataInicioPrevista: formData.get("dataInicioPrevista"),
    dataFimPrevista: formData.get("dataFimPrevista"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const ordem = await nextChildOrdem(prisma, data.workId, data.stageId);
  await prisma.planningTask.create({
    data: {
      workId: data.workId,
      stageId: data.stageId,
      nome: data.nome,
      ordem,
      dataInicioPrevista: new Date(data.dataInicioPrevista),
      dataFimPrevista: new Date(data.dataFimPrevista),
    },
  });

  revalidatePath(`/obras/${data.workId}/planejamento`);
  return undefined;
}

export async function updateTaskName(taskId: string, workId: string, nome: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const trimmed = nome.trim();
  if (!trimmed) return;

  await prisma.planningTask.update({ where: { id: taskId }, data: { nome: trimmed } });
  revalidatePath(`/obras/${workId}/planejamento`);
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
      const codigo = row.codigo || String(existingStageCount + index + 1);
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
      const codigo = row.codigo || `${stageCodigo}.${countSoFar + 1}`;

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
