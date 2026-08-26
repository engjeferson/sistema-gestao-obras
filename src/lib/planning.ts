import type { PlanningStatus } from "@/generated/prisma/enums";
import { addWorkingDays, countWorkingDays, type WorkCalendar } from "@/lib/schedule-dates";

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

/**
 * Recalcula datas das sucessoras a partir de uma atividade que teve sua data de término alterada.
 * Regra: início da sucessora = max(início atual, próximo dia útil após fim da predecessora + lag
 * dias úteis), preservando a duração original da sucessora **em dias úteis** (não em milissegundos
 * corridos). Propaga recursivamente pela cadeia de dependências, com proteção contra ciclos.
 * Função pura — não acessa o banco; `calendar` já vem resolvido (dias da semana + feriados do work).
 */
export function computeCascade(
  tasks: TaskForCascade[],
  dependencies: DependencyForCascade[],
  changedTaskId: string,
  calendar: WorkCalendar,
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

      const earliestStart = addWorkingDays(predecessor.dataFimPrevista, dep.lagDias + 1, calendar);
      if (earliestStart.getTime() > successor.dataInicioPrevista.getTime()) {
        const durationWorkingDays = countWorkingDays(successor.dataInicioPrevista, successor.dataFimPrevista, calendar);
        const newStart = earliestStart;
        const newEnd = addWorkingDays(newStart, Math.max(durationWorkingDays, 1) - 1, calendar);

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
