const TIME_ZONE = "America/Sao_Paulo";

export function formatAgendaDateTime(date: Date, diaTodo = false): string {
  if (diaTodo) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, dateStyle: "full" }).format(date);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export function formatAgendaTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, timeStyle: "short" }).format(date);
}
