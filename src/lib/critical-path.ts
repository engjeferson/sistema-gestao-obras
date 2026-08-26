import { addWorkingDays, subtractWorkingDays, countWorkingDays, type WorkCalendar } from "@/lib/schedule-dates";
import type { TaskForCascade, DependencyForCascade } from "@/lib/planning";

export type CriticalPathResult = {
  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;
  slackDays: number;
  isCritical: boolean;
};

/**
 * CPM (Critical Path Method) sobre o grafo de dependências já existente. Diferente de um CPM de
 * livro-texto (que ignora datas manuais e otimiza tudo pro início mais cedo possível), aqui o
 * início "mais cedo possível" de uma atividade SEM predecessora é a própria `dataInicioPrevista`
 * dela — reflete o cronograma como o usuário realmente montou, não um hipotético; só empurra pra
 * frente quando uma predecessora obriga. Isso responde "dado como está agendado hoje, qual cadeia
 * não tem folga nenhuma" — a leitura mais útil pra esse app, onde as datas já são a fonte da verdade.
 * Função pura — não acessa o banco; `calendar` já vem resolvido (dias da semana + feriados do work).
 */
export function computeCriticalPath(
  tasks: TaskForCascade[],
  dependencies: DependencyForCascade[],
  calendar: WorkCalendar,
): Map<string, CriticalPathResult> {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const predsOf = new Map<string, DependencyForCascade[]>();
  const succsOf = new Map<string, DependencyForCascade[]>();
  for (const dep of dependencies) {
    if (!taskMap.has(dep.predecessorTaskId) || !taskMap.has(dep.successorTaskId)) continue;
    const preds = predsOf.get(dep.successorTaskId) ?? [];
    preds.push(dep);
    predsOf.set(dep.successorTaskId, preds);
    const succs = succsOf.get(dep.predecessorTaskId) ?? [];
    succs.push(dep);
    succsOf.set(dep.predecessorTaskId, succs);
  }

  const duration = new Map<string, number>();
  for (const t of tasks) {
    duration.set(t.id, Math.max(countWorkingDays(t.dataInicioPrevista, t.dataFimPrevista, calendar), 1));
  }

  // Passada de ida: earlyStart/earlyFinish. Memoizado, com proteção contra ciclo (mesmo espírito
  // do `visited` em computeCascade — um grafo com ciclo não é suportado, só evita loop infinito).
  const earlyStart = new Map<string, Date>();
  const earlyFinish = new Map<string, Date>();
  const visitingForward = new Set<string>();

  function computeEarly(taskId: string) {
    if (earlyFinish.has(taskId) || visitingForward.has(taskId)) return;
    visitingForward.add(taskId);
    const task = taskMap.get(taskId)!;
    let start = task.dataInicioPrevista;
    for (const dep of predsOf.get(taskId) ?? []) {
      computeEarly(dep.predecessorTaskId);
      const predFinish = earlyFinish.get(dep.predecessorTaskId);
      if (!predFinish) continue;
      const candidate = addWorkingDays(predFinish, dep.lagDias + 1, calendar);
      if (candidate.getTime() > start.getTime()) start = candidate;
    }
    earlyStart.set(taskId, start);
    earlyFinish.set(taskId, addWorkingDays(start, duration.get(taskId)! - 1, calendar));
    visitingForward.delete(taskId);
  }
  for (const t of tasks) computeEarly(t.id);

  const projectFinish =
    tasks.length > 0 ? new Date(Math.max(...tasks.map((t) => earlyFinish.get(t.id)!.getTime()))) : new Date();

  // Passada de volta: lateFinish/lateStart. Atividade sem sucessora usa o fim do projeto como
  // referência (só assim uma atividade "de ponta" que termina antes do fim geral ganha folga).
  const lateStart = new Map<string, Date>();
  const lateFinish = new Map<string, Date>();
  const visitingBackward = new Set<string>();

  function computeLate(taskId: string) {
    if (lateStart.has(taskId) || visitingBackward.has(taskId)) return;
    visitingBackward.add(taskId);
    const succs = succsOf.get(taskId) ?? [];
    let finish: Date;
    if (succs.length === 0) {
      finish = projectFinish;
    } else {
      let minFinish: Date | null = null;
      for (const dep of succs) {
        computeLate(dep.successorTaskId);
        const succStart = lateStart.get(dep.successorTaskId);
        if (!succStart) continue;
        const candidate = subtractWorkingDays(succStart, dep.lagDias + 1, calendar);
        if (minFinish === null || candidate.getTime() < minFinish.getTime()) minFinish = candidate;
      }
      finish = minFinish ?? projectFinish;
    }
    lateFinish.set(taskId, finish);
    lateStart.set(taskId, subtractWorkingDays(finish, duration.get(taskId)! - 1, calendar));
    visitingBackward.delete(taskId);
  }
  for (const t of tasks) computeLate(t.id);

  const result = new Map<string, CriticalPathResult>();
  for (const t of tasks) {
    const es = earlyStart.get(t.id)!;
    const ef = earlyFinish.get(t.id)!;
    const ls = lateStart.get(t.id)!;
    const lf = lateFinish.get(t.id)!;
    const slackDays = countWorkingDays(es, ls, calendar) - 1;
    result.set(t.id, { earlyStart: es, earlyFinish: ef, lateStart: ls, lateFinish: lf, slackDays, isCritical: slackDays <= 0 });
  }
  return result;
}
