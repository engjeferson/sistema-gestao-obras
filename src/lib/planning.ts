import type { PlanningStatus } from "@/generated/prisma/enums";

export function getEffectiveStatus(task: { percentualExecutado: number; dataFimPrevista: Date }): PlanningStatus {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const fimPrevista = new Date(task.dataFimPrevista);
  fimPrevista.setUTCHours(0, 0, 0, 0);

  if (task.percentualExecutado >= 100) return "CONCLUIDA";
  if (hoje > fimPrevista) return "ATRASADA";
  if (task.percentualExecutado > 0) return "EM_ANDAMENTO";
  return "NAO_INICIADA";
}

export type TaskForCascade = {
  id: string;
  dataInicioPrevista: Date;
  dataFimPrevista: Date;
};

export type DependencyForCascade = {
  predecessorTaskId: string;
  successorTaskId: string;
  lagDias: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Recalcula datas das sucessoras a partir de uma atividade que teve sua data de término alterada.
 * Regra: início da sucessora = max(início atual, fim da predecessora + lag + 1 dia), preservando a
 * duração original da sucessora. Propaga recursivamente pela cadeia de dependências, com proteção
 * contra ciclos. Função pura — não acessa o banco.
 */
export function computeCascade(
  tasks: TaskForCascade[],
  dependencies: DependencyForCascade[],
  changedTaskId: string,
): Map<string, { dataInicioPrevista: Date; dataFimPrevista: Date }> {
  const taskMap = new Map(tasks.map((t) => [t.id, { ...t }]));
  const updates = new Map<string, { dataInicioPrevista: Date; dataFimPrevista: Date }>();

  const bySuccessor = new Map<string, DependencyForCascade[]>();
  for (const dep of dependencies) {
    const list = bySuccessor.get(dep.predecessorTaskId) ?? [];
    list.push(dep);
    bySuccessor.set(dep.predecessorTaskId, list);
  }

  function propagate(taskId: string, visited: Set<string>) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const predecessor = taskMap.get(taskId);
    if (!predecessor) return;

    for (const dep of bySuccessor.get(taskId) ?? []) {
      const successor = taskMap.get(dep.successorTaskId);
      if (!successor) continue;

      const earliestStart = new Date(predecessor.dataFimPrevista.getTime() + (dep.lagDias + 1) * MS_PER_DAY);
      if (earliestStart.getTime() > successor.dataInicioPrevista.getTime()) {
        const duration = successor.dataFimPrevista.getTime() - successor.dataInicioPrevista.getTime();
        const newStart = earliestStart;
        const newEnd = new Date(newStart.getTime() + duration);

        successor.dataInicioPrevista = newStart;
        successor.dataFimPrevista = newEnd;
        updates.set(dep.successorTaskId, { dataInicioPrevista: newStart, dataFimPrevista: newEnd });
        propagate(dep.successorTaskId, visited);
      }
    }
  }

  propagate(changedTaskId, new Set());
  return updates;
}
