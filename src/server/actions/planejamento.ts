"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { getEffectiveStatus, computeCascade } from "@/lib/planning";
import { computeCriticalPath } from "@/lib/critical-path";
import { addWorkingDays, countWorkingDays, toDateOnlyString, type WorkCalendar } from "@/lib/schedule-dates";
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
 * Numera cada etapa/sub/item em formato EAP (1, 1.1, 1.2, 2, 2.1...) a partir da posição real na
 * árvore (`ordem`), não de um valor gravado — garante que o código esteja sempre presente, em
 * sequência e sem buracos, inclusive depois de mover/excluir itens.
 */
function assignCodes(roots: StageNode[]) {
  const sorted = [...roots].sort((a, b) => a.ordem - b.ordem);
  sorted.forEach((root, index) => {
    root.codigo = String(index + 1);
    assignChildCodes(root);
  });
}

function assignChildCodes(node: StageNode) {
  const combined = [
    ...node.children.map((c) => ({ kind: "stage" as const, ordem: c.ordem, ref: c })),
    ...node.tasks.map((t) => ({ kind: "task" as const, ordem: t.ordem, ref: t })),
  ].sort((a, b) => a.ordem - b.ordem);

  combined.forEach((entry, index) => {
    entry.ref.codigo = `${node.codigo}.${index + 1}`;
    if (entry.kind === "stage") assignChildCodes(entry.ref);
  });
}

export async function getWorkCalendar(client: TxClient, workId: string): Promise<WorkCalendar> {
  const [work, holidays] = await Promise.all([
    client.work.findUniqueOrThrow({ where: { id: workId }, select: { workingWeekdays: true } }),
    client.workHoliday.findMany({ where: { workId }, select: { data: true } }),
  ]);
  return {
    workingWeekdays: work.workingWeekdays,
    holidays: new Set(holidays.map((h) => toDateOnlyString(h.data))),
  };
}

export async function applyCascadeForTask(tx: TxClient, workId: string, changedTaskId: string) {
  const [tasks, dependencies, calendar] = await Promise.all([
    tx.planningTask.findMany({
      where: { workId },
      select: { id: true, dataInicioPrevista: true, dataFimPrevista: true },
    }),
    tx.planningDependency.findMany({
      where: { predecessorTask: { workId }, successorTask: { workId } },
      select: { predecessorTaskId: true, successorTaskId: true, lagDias: true },
    }),
    getWorkCalendar(tx, workId),
  ]);

  const updates = computeCascade(tasks, dependencies, changedTaskId, calendar);
  for (const [taskId, dates] of updates) {
    await tx.planningTask.update({ where: { id: taskId }, data: dates });
  }
  return updates;
}

/** Caminho crítico da obra inteira — calculado a cada carregamento da página (barato, sem cache). */
export async function getCriticalPathForWork(workId: string) {
  const [tasks, dependencies, calendar] = await Promise.all([
    prisma.planningTask.findMany({
      where: { workId },
      select: { id: true, dataInicioPrevista: true, dataFimPrevista: true },
    }),
    prisma.planningDependency.findMany({
      where: { predecessorTask: { workId }, successorTask: { workId } },
      select: { predecessorTaskId: true, successorTaskId: true, lagDias: true },
    }),
    getWorkCalendar(prisma, workId),
  ]);

  const result = computeCriticalPath(tasks, dependencies, calendar);
  return new Map([...result].map(([taskId, r]) => [taskId, r.isCritical]));
}

/**
 * Fixa a linha de base da obra inteira: copia as datas atuais de cada atividade pra
 * `baselineInicio`/`baselineFim`. Chamar de novo SOBRESCREVE a linha de base anterior — não há
 * versionamento, é uma referência fixa só (bate com a spec: "início/término planejado" único).
 */
export async function setPlanningBaseline(workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const tasks = await prisma.planningTask.findMany({
    where: { workId },
    select: { id: true, dataInicioPrevista: true, dataFimPrevista: true },
  });

  await prisma.$transaction(
    tasks.map((t) =>
      prisma.planningTask.update({
        where: { id: t.id },
        data: { baselineInicio: t.dataInicioPrevista, baselineFim: t.dataFimPrevista },
      }),
    ),
  );

  revalidatePath(`/obras/${workId}/planejamento`);
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

export type PredecessorChip = { type: "stage" | "task"; id: string; codigo: string; nome: string };

export type StageTreeNode = {
  id: string;
  codigo: string | null;
  nome: string;
  ordem: number;
  dataInicioPrevista: Date | null;
  dataFimPrevista: Date | null;
  percentualExecutado: number;
  status: string;
  predecessorRef: string | null;
  predecessorChips: PredecessorChip[];
  tasks: {
    id: string;
    codigo: string | null;
    nome: string;
    dataInicioPrevista: Date;
    dataFimPrevista: Date;
    baselineInicio: Date | null;
    baselineFim: Date | null;
    percentualExecutado: number;
    status: string;
    predecessors: { id: string; predecessorTask: { id: string; codigo: string | null; nome: string } }[];
    predecessorChips: PredecessorChip[];
  }[];
  children: StageTreeNode[];
};

/** Todos os ids de item (folha) dentro de uma etapa/sub, recursivamente. */
function leafTaskIds(node: StageTreeNode | null): string[] {
  if (!node) return [];
  return [...node.tasks.map((t) => t.id), ...node.children.flatMap(leafTaskIds)];
}

function findStageById(nodes: StageTreeNode[], id: string): StageTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findStageById(n.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * Término da etapa/sub: o maior término entre as atividades dela (recursivo); se ela ainda não
 * tem nenhuma (funciona como "atividade solta"), usa a data própria dela.
 */
function maxFinishDate(node: StageTreeNode): Date | null {
  const dates = [
    ...node.tasks.map((t) => t.dataFimPrevista),
    ...node.children.map(maxFinishDate).filter((d): d is Date => d !== null),
  ];
  if (dates.length > 0) return new Date(Math.max(...dates.map((d) => d.getTime())));
  return node.dataFimPrevista;
}

/** Resolve um código digitado (de etapa/sub OU item) pros ids de item que ele representa. */
function findEntityByCode(nodes: StageTreeNode[], code: string): { taskIds: string[]; dataFimPrevista: Date | null } | null {
  for (const n of nodes) {
    if (n.codigo === code) return { taskIds: leafTaskIds(n), dataFimPrevista: maxFinishDate(n) };
    const task = n.tasks.find((t) => t.codigo === code);
    if (task) return { taskIds: [task.id], dataFimPrevista: task.dataFimPrevista };
    const found = findEntityByCode(n.children, code);
    if (found) return found;
  }
  return null;
}

/**
 * Agrupa um conjunto de ids de item predecessor em "chips" — prefere a etapa/sub mais
 * abrangente (percorre a árvore da raiz pra baixo) sempre que TODOS os itens dela estiverem
 * no conjunto; o que sobrar vira chip de item individual.
 */
function groupIntoChips(taskIds: Set<string>, roots: StageTreeNode[], taskById: Map<string, StageTreeNode["tasks"][number]>): PredecessorChip[] {
  const remaining = new Set(taskIds);
  const chips: PredecessorChip[] = [];
  const queue: StageTreeNode[] = [...roots];
  while (queue.length > 0) {
    const stage = queue.shift()!;
    const leaves = leafTaskIds(stage);
    if (leaves.length > 0 && leaves.every((id) => remaining.has(id))) {
      chips.push({ type: "stage", id: stage.id, codigo: stage.codigo ?? "", nome: stage.nome });
      for (const id of leaves) remaining.delete(id);
    } else {
      queue.push(...stage.children);
    }
  }
  for (const id of remaining) {
    const task = taskById.get(id);
    if (task) chips.push({ type: "task", id: task.id, codigo: task.codigo ?? "", nome: task.nome });
  }
  return chips;
}

export async function addPlanningDependencyByCode(
  workId: string,
  predecessorCode: string,
  ownerStageId: string | null,
  ownerTaskId: string | null,
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const roots = await listStagesWithTasks(workId);
  const predecessor = findEntityByCode(roots, predecessorCode.trim());
  if (!predecessor) {
    throw new Error("Código não encontrado.");
  }

  const ownerStage = ownerStageId ? findStageById(roots, ownerStageId) : null;
  const ownerTaskIds = ownerTaskId ? [ownerTaskId] : leafTaskIds(ownerStage);

  // Etapa-alvo ainda sem nenhuma atividade — funciona como uma "atividade solta", então não há
  // atividade nenhuma pra criar um vínculo de verdade (PlanningDependency é sempre entre
  // atividades). Em vez de vínculo, empurra a data de início dela pra depois do término da
  // predecessora, uma vez só — mantendo a duração que ela já tinha, se tinha alguma.
  if (ownerStage && ownerTaskIds.length === 0) {
    if (!predecessor.dataFimPrevista) {
      throw new Error("A predecessora ainda não tem data de término definida.");
    }
    const calendar = await getWorkCalendar(prisma, workId);
    const newStart = addWorkingDays(predecessor.dataFimPrevista, 1, calendar);
    const currentDuration =
      ownerStage.dataInicioPrevista && ownerStage.dataFimPrevista
        ? countWorkingDays(ownerStage.dataInicioPrevista, ownerStage.dataFimPrevista, calendar)
        : 1;
    const newEnd = addWorkingDays(newStart, currentDuration - 1, calendar);

    await prisma.planningStage.update({
      where: { id: ownerStage.id },
      // predecessorRef não é um vínculo de verdade (não existe atividade pra sustentar isso) —
      // só pra tela lembrar o código digitado e continuar mostrando no campo de predecessoras.
      data: { dataInicioPrevista: newStart, dataFimPrevista: newEnd, predecessorRef: predecessorCode.trim() },
    });
    revalidatePath(`/obras/${workId}/planejamento`);
    return;
  }

  const pairs = predecessor.taskIds.flatMap((p) =>
    ownerTaskIds.filter((s) => s !== p).map((s) => ({ predecessorTaskId: p, successorTaskId: s })),
  );
  if (pairs.length === 0) {
    throw new Error("Não foi possível relacionar — confira se não é o próprio item.");
  }

  await prisma.planningDependency.createMany({ data: pairs, skipDuplicates: true });

  await prisma.$transaction(async (tx) => {
    for (const predecessorTaskId of new Set(predecessor.taskIds)) {
      await applyCascadeForTask(tx, workId, predecessorTaskId);
    }
  });

  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function removeGroupedDependency(
  workId: string,
  predecessorStageId: string | null,
  predecessorTaskId: string | null,
  ownerStageId: string | null,
  ownerTaskId: string | null,
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const roots = await listStagesWithTasks(workId);
  const predecessorTaskIds = predecessorTaskId
    ? [predecessorTaskId]
    : leafTaskIds(predecessorStageId ? findStageById(roots, predecessorStageId) : null);
  const ownerTaskIds = ownerTaskId ? [ownerTaskId] : leafTaskIds(ownerStageId ? findStageById(roots, ownerStageId) : null);

  await prisma.planningDependency.deleteMany({
    where: { predecessorTaskId: { in: predecessorTaskIds }, successorTaskId: { in: ownerTaskIds } },
  });

  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function listStagesWithTasks(workId: string): Promise<StageTreeNode[]> {
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

  // Mesma lógica de auto-cura, agora pra etapa: só é relevante enquanto ela funciona como "atividade
  // solta" (sem nenhum item lançado), mas curar sempre é inofensivo — quando a etapa tem atividades,
  // a tela ignora esse campo e mostra o agregado delas.
  const toUpdateStages: { id: string; status: ReturnType<typeof getEffectiveStatus> }[] = [];
  const healedStageStatusById = new Map(
    stages.map((stage) => {
      const effectiveStatus = getEffectiveStatus({
        percentualExecutado: Number(stage.percentualExecutado),
        dataFimPrevista: stage.dataFimPrevista,
      });
      if (effectiveStatus !== stage.status) {
        toUpdateStages.push({ id: stage.id, status: effectiveStatus });
      }
      return [stage.id, effectiveStatus];
    }),
  );

  if (toUpdateStages.length > 0) {
    await prisma.$transaction(
      toUpdateStages.map((item) => prisma.planningStage.update({ where: { id: item.id }, data: { status: item.status } })),
    );
  }

  // Monta a árvore em memória (profundidade livre) a partir da lista plana.
  type Node = (typeof stages)[number] & { tasks: NonNullable<ReturnType<typeof healedTasksByStage.get>>; children: Node[] };
  const nodeById = new Map<string, Node>();
  for (const stage of stages) {
    nodeById.set(stage.id, {
      ...stage,
      status: healedStageStatusById.get(stage.id) ?? stage.status,
      tasks: healedTasksByStage.get(stage.id) ?? [],
      children: [],
    });
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

  const tree = roots as unknown as StageTreeNode[];

  const taskById = new Map<string, StageTreeNode["tasks"][number]>();
  (function indexTasks(nodes: StageTreeNode[]) {
    for (const n of nodes) {
      for (const t of n.tasks) taskById.set(t.id, t);
      indexTasks(n.children);
    }
  })(tree);

  // Chips de predecessora de cada item: agrupa pela etapa/sub mais abrangente possível.
  (function assignTaskChips(nodes: StageTreeNode[]) {
    for (const n of nodes) {
      for (const t of n.tasks) {
        const idSet = new Set(t.predecessors.map((d) => d.predecessorTask.id));
        t.predecessorChips = groupIntoChips(idSet, tree, taskById);
      }
      assignTaskChips(n.children);
    }
  })(tree);

  // Chips de predecessora de cada etapa/sub: só as predecessoras comuns a TODOS os itens dela
  // (o que realmente bloqueia a etapa inteira) — não a união (que superestimaria).
  (function assignStageChips(nodes: StageTreeNode[]) {
    for (const n of nodes) {
      const leaves = leafTaskIds(n)
        .map((id) => taskById.get(id))
        .filter((t): t is StageTreeNode["tasks"][number] => !!t);
      let intersection: Set<string> = new Set();
      if (leaves.length > 0) {
        intersection = new Set(leaves[0].predecessors.map((d) => d.predecessorTask.id));
        for (let i = 1; i < leaves.length; i++) {
          const idSet = new Set(leaves[i].predecessors.map((d) => d.predecessorTask.id));
          intersection = new Set([...intersection].filter((id) => idSet.has(id)));
        }
      }
      n.predecessorChips = leaves.length > 0 ? groupIntoChips(intersection, tree, taskById) : [];
      assignStageChips(n.children);
    }
  })(tree);

  return tree;
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

/**
 * Data "manual" da etapa/sub — só faz sentido (e só é editável na UI) enquanto ela ainda não
 * tem nenhum item dentro; a partir daí a data exibida vira sempre o agregado dos itens.
 */
export async function updateStageDates(stageId: string, workId: string, start: string, end: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.planningStage.update({
    where: { id: stageId },
    data: { dataInicioPrevista: new Date(start), dataFimPrevista: new Date(end) },
  });

  revalidatePath(`/obras/${workId}/planejamento`);
}

/**
 * % executado "manual" da etapa/sub — mesma regra da data: só faz sentido (e só é editável na UI)
 * enquanto ela ainda não tem nenhum item dentro. O status não é escolhido aqui — ele é sempre
 * recalculado a partir do % e da data (mesma lógica de uma atividade) na próxima leitura.
 */
export async function updateStageProgress(stageId: string, workId: string, percentual: number) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const clamped = Math.min(100, Math.max(0, percentual));
  await prisma.planningStage.update({ where: { id: stageId }, data: { percentualExecutado: clamped } });

  revalidatePath(`/obras/${workId}/planejamento`);
}

/** Limpa o código de predecessora "lembrado" numa etapa sem atividades (ver `predecessorRef`). */
export async function clearStagePredecessorRef(stageId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.planningStage.update({ where: { id: stageId }, data: { predecessorRef: null } });
  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function deleteStage(stageId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.planningStage.delete({ where: { id: stageId } });
  revalidatePath(`/obras/${workId}/planejamento`);
}

/** Reordena (arrastar) as etapas/subs irmãs sob `parentId` pra bater com `orderedStageIds`. */
/**
 * Reordena (arrastar) os filhos diretos de `parentId` (`null` = nível superior) — subs e itens
 * juntos, na mesma lista, já que aparecem intercalados na Lista.
 */
export async function reorderChildren(
  workId: string,
  parentId: string | null,
  orderedItems: { id: string; kind: "stage" | "task" }[],
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.$transaction(
    orderedItems.map((item, index) =>
      item.kind === "stage"
        ? prisma.planningStage.updateMany({ where: { id: item.id, workId, parentId }, data: { ordem: index } })
        : prisma.planningTask.updateMany({
            where: { id: item.id, workId, stageId: parentId ?? undefined },
            data: { ordem: index },
          }),
    ),
  );

  revalidatePath(`/obras/${workId}/planejamento`);
}

/** Move uma atividade pra outra etapa/sub (arrastar entre etapas) — entra no fim da nova lista. */
export async function moveTaskToStage(taskId: string, workId: string, newStageId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const ordem = await nextChildOrdem(prisma, workId, newStageId);
  await prisma.planningTask.update({
    where: { id: taskId },
    data: { stageId: newStageId, ordem },
  });

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

  const EXISTING_PREFIX = "existing:";
  const isExistingRow = (clientId: string) => clientId.startsWith(EXISTING_PREFIX);
  // Linhas "existing:" já representam etapas/atividades reais (carregadas na tela pra dar
  // contexto e servir de predecessora) — este lote só CRIA as demais, nunca recria/edita as
  // que já existem.
  const newEtapaRows = etapaRows.filter((r) => !isExistingRow(r.clientId));
  const newAtividadeRows = atividadeRows.filter((r) => !isExistingRow(r.clientId));

  await prisma.$transaction(async (tx) => {
    const stageIdMap = new Map<string, string>(); // clientId (deste lote) -> id real

    function resolveParentStageId(parentClientId: string | undefined): string | null {
      if (!parentClientId) return null;
      if (parentClientId.startsWith(EXISTING_PREFIX)) return parentClientId.slice(EXISTING_PREFIX.length);
      return stageIdMap.get(parentClientId) ?? null;
    }

    // Cria as ETAPA em ordem topológica: uma linha só é criada depois que sua etapa-pai (quando
    // é outra linha ETAPA deste mesmo lote) já tiver sido criada — permite aninhar em qualquer
    // nível dentro do próprio lote, além de aninhar em etapas/subs já existentes.
    const pending = [...newEtapaRows];
    let progressed = true;
    while (pending.length > 0 && progressed) {
      progressed = false;
      for (let i = pending.length - 1; i >= 0; i--) {
        const row = pending[i];
        const parentId = row.parentClientId;
        const waitingOnBatchParent =
          parentId && !parentId.startsWith(EXISTING_PREFIX) && newEtapaRows.some((e) => e.clientId === parentId) && !stageIdMap.has(parentId);
        if (waitingOnBatchParent) continue;

        const resolvedParentId = resolveParentStageId(parentId);
        const ordem = resolvedParentId
          ? await nextChildOrdem(tx, data.workId, resolvedParentId)
          : await nextStageOrdem(tx, data.workId, null);
        const created = await tx.planningStage.create({
          data: {
            workId: data.workId,
            parentId: resolvedParentId,
            nome: row.nome,
            ordem,
            dataInicioPrevista: row.dataInicioPrevista ? new Date(row.dataInicioPrevista) : null,
            dataFimPrevista: row.dataFimPrevista ? new Date(row.dataFimPrevista) : null,
          },
        });
        stageIdMap.set(row.clientId, created.id);

        // Valor solto da etapa (antes dela estar quebrada em atividades) — mesma ideia do custo
        // previsto de uma atividade, só que ligado direto na etapa em vez de numa tarefa.
        if (row.custoPrevisto) {
          await tx.budgetItem.create({
            data: {
              workId: data.workId,
              stageId: created.id,
              tipoCusto: row.tipoCusto ?? "OUTROS",
              valorTotalPrevisto: row.custoPrevisto,
            },
          });
        }

        pending.splice(i, 1);
        progressed = true;
      }
    }
    if (pending.length > 0) {
      throw new Error("Referência circular entre etapas do lote.");
    }

    const taskIdMap = new Map<string, string>(); // clientId (existente ou deste lote) -> id real
    for (const row of atividadeRows) {
      if (isExistingRow(row.clientId)) {
        taskIdMap.set(row.clientId, row.clientId.slice(EXISTING_PREFIX.length));
      }
    }

    for (const row of newAtividadeRows) {
      const stageId = resolveParentStageId(row.parentClientId);
      if (!stageId) continue;

      const ordem = await nextChildOrdem(tx, data.workId, stageId);
      const created = await tx.planningTask.create({
        data: {
          workId: data.workId,
          stageId,
          nome: row.nome,
          ordem,
          dataInicioPrevista: new Date(row.dataInicioPrevista!),
          dataFimPrevista: new Date(row.dataFimPrevista!),
        },
      });
      taskIdMap.set(row.clientId, created.id);

      if (row.custoPrevisto) {
        await tx.budgetItem.create({
          data: {
            workId: data.workId,
            taskId: created.id,
            tipoCusto: row.tipoCusto ?? "OUTROS",
            valorTotalPrevisto: row.custoPrevisto,
          },
        });
      }
    }

    // Percorre TODAS as atividades (novas + existentes, essas últimas já com sua predecessora
    // pré-marcada na tela) — createMany + skipDuplicates deixa de graça o caso comum de uma
    // atividade existente reenviar um vínculo que já existe, e ainda permite uma atividade NOVA
    // apontar pra uma já existente (algo que a tela não deixava fazer antes).
    const dependencyPairs: { predecessorTaskId: string; successorTaskId: string }[] = [];
    for (const row of atividadeRows) {
      const successorId = taskIdMap.get(row.clientId);
      if (!successorId || !row.predecessorClientIds) continue;

      for (const predecessorClientId of row.predecessorClientIds) {
        const predecessorId = taskIdMap.get(predecessorClientId);
        if (!predecessorId || predecessorId === successorId) continue;
        dependencyPairs.push({ predecessorTaskId: predecessorId, successorTaskId: successorId });
      }
    }
    if (dependencyPairs.length > 0) {
      await tx.planningDependency.createMany({ data: dependencyPairs, skipDuplicates: true });
    }
  });

  revalidatePath(`/obras/${data.workId}/planejamento`);
  redirect(`/obras/${data.workId}/planejamento`);
}
