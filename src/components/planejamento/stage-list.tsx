import type { PredecessorChip } from "@/server/actions/planejamento";

export type PlainTask = {
  id: string;
  codigo: string;
  nome: string;
  dataInicioPrevista: Date;
  dataFimPrevista: Date;
  baselineInicio: Date | null;
  baselineFim: Date | null;
  percentualExecutado: number;
  status: string;
  predecessorChips: PredecessorChip[];
};

export type PlainStage = {
  id: string;
  codigo: string;
  nome: string;
  dataInicioPrevista: Date | null;
  dataFimPrevista: Date | null;
  predecessorChips: PredecessorChip[];
  tasks: PlainTask[];
  children: PlainStage[];
};

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function collectAllTasks(stage: PlainStage): PlainTask[] {
  return [...stage.tasks, ...stage.children.flatMap(collectAllTasks)];
}

export function hasAnyTask(stage: PlainStage): boolean {
  return stage.tasks.length > 0 || stage.children.some(hasAnyTask);
}

// O código é sempre "pai.N" (ex: "2.3") — o último segmento é a posição entre os irmãos
// (sub-etapas e itens intercalados), usado pra ordenar sem precisar de um campo `ordem` no
// tipo do cliente.
function siblingIndex(codigo: string): number {
  const parts = codigo.split(".");
  return Number(parts[parts.length - 1]);
}

type CombinedEntry = { kind: "stage"; node: PlainStage } | { kind: "task"; node: PlainTask };

function combineEntries(stages: PlainStage[], tasks: PlainTask[]): CombinedEntry[] {
  return [
    ...stages.map((s): CombinedEntry => ({ kind: "stage", node: s })),
    ...tasks.map((t): CombinedEntry => ({ kind: "task", node: t })),
  ].sort((a, b) => siblingIndex(a.node.codigo) - siblingIndex(b.node.codigo));
}

/** Lista pesquisável de predecessoras possíveis (etapas e atividades) a partir da árvore já carregada. */
export function flattenPredecessorOptions(stages: PlainStage[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  function walk(list: PlainStage[]) {
    for (const stage of list) {
      out.push({ value: stage.codigo, label: `${stage.codigo} — ${stage.nome} (etapa)` });
      for (const task of stage.tasks) out.push({ value: task.codigo, label: `${task.codigo} — ${task.nome}` });
      walk(stage.children);
    }
  }
  walk(stages);
  return out;
}

export type PlanningRow =
  | { type: "stage"; stage: PlainStage; start: Date; end: Date; depth: number; groupId: string | null; stripe: boolean }
  | { type: "task"; task: PlainTask; depth: number; groupId: string; stripe: boolean };

/**
 * Achata a árvore de etapas/atividades em uma única lista (pré-ordem, respeitando etapas
 * recolhidas e a ordem real de irmãos intercalados por código) — é essa MESMA lista que
 * alimenta tanto o painel de tabela quanto o Gantt, garantindo que as duas fiquem sempre
 * exatamente na mesma linha (fonte única de estado).
 *
 * `groupId` é o id do "grupo de reordenação" da linha: pra uma etapa, é o id da etapa-pai
 * (ou null no topo); pra uma atividade, é o id da própria etapa dona — o mesmo conceito que
 * `reorderChildren`/`moveTaskToStage` usam como `parentId`/`stageId`.
 */
export function buildPlanningRows(stages: PlainStage[], collapsed: Set<string>): PlanningRow[] {
  const out: PlanningRow[] = [];
  let stripeCounter = 0;

  function pushStage(stage: PlainStage, depth: number, groupId: string | null) {
    const descendantTasks = collectAllTasks(stage);
    const starts = descendantTasks.map((t) => t.dataInicioPrevista.getTime());
    const ends = descendantTasks.map((t) => t.dataFimPrevista.getTime());
    const start = starts.length ? new Date(Math.min(...starts)) : (stage.dataInicioPrevista ?? new Date());
    const end = ends.length ? new Date(Math.max(...ends)) : (stage.dataFimPrevista ?? new Date());
    const stripe = depth > 0 ? stripeCounter++ % 2 === 1 : false;
    out.push({ type: "stage", stage, start, end, depth, groupId, stripe });

    if (!collapsed.has(stage.id)) {
      for (const entry of combineEntries(stage.children, stage.tasks)) {
        if (entry.kind === "stage") {
          pushStage(entry.node, depth + 1, stage.id);
        } else {
          out.push({ type: "task", task: entry.node, depth: depth + 1, groupId: stage.id, stripe: stripeCounter++ % 2 === 1 });
        }
      }
    }
  }

  for (const stage of stages) pushStage(stage, 0, null);
  return out;
}
