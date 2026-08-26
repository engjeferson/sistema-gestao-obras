import { addDays, subDays, eachDayOfInterval } from "date-fns";

/**
 * Calendário de dias úteis de uma obra: quais dias da semana contam como úteis
 * (0=domingo...6=sábado, igual a `Date.getUTCDay()`) + datas específicas excluídas
 * (feriados/paralisações), como string "YYYY-MM-DD" pra lookup O(1).
 */
export type WorkCalendar = {
  workingWeekdays: number[];
  holidays: Set<string>;
};

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWorkingDay(date: Date, calendar: WorkCalendar): boolean {
  return calendar.workingWeekdays.includes(date.getUTCDay()) && !calendar.holidays.has(toDateOnlyString(date));
}

/**
 * Avança `workingDaysToAdd` dias úteis a partir de `start` (0 = o próprio dia, se for útil, ou o
 * próximo dia útil). Não usa `date-fns/addBusinessDays` porque esse é fixo seg-sex e não aceita
 * dias da semana configuráveis nem feriados.
 */
export function addWorkingDays(start: Date, workingDaysToAdd: number, calendar: WorkCalendar): Date {
  let date = start;
  let counted = isWorkingDay(date, calendar) ? 1 : 0;
  while (counted <= workingDaysToAdd) {
    date = addDays(date, 1);
    if (isWorkingDay(date, calendar)) counted++;
  }
  return date;
}

/** Simétrico a `addWorkingDays`, andando pra trás — usado na passada de volta do caminho crítico. */
export function subtractWorkingDays(end: Date, workingDaysToSubtract: number, calendar: WorkCalendar): Date {
  let date = end;
  let counted = isWorkingDay(date, calendar) ? 1 : 0;
  while (counted <= workingDaysToSubtract) {
    date = subDays(date, 1);
    if (isWorkingDay(date, calendar)) counted++;
  }
  return date;
}

/** Quantidade de dias úteis entre `start` e `end`, inclusive nas duas pontas. */
export function countWorkingDays(start: Date, end: Date, calendar: WorkCalendar): number {
  if (end.getTime() < start.getTime()) return 0;
  return eachDayOfInterval({ start, end }).filter((d) => isWorkingDay(d, calendar)).length;
}
