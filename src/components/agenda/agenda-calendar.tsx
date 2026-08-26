"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AgendaEventActions } from "./agenda-event-actions";

export type AgendaEventListItem = {
  id: string;
  titulo: string;
  local: string | null;
  inicio: string;
  fim: string | null;
  diaTodo: boolean;
  status: "CONFIRMADO" | "CANCELADO";
  origem: "MANUAL" | "WHATSAPP";
  work: { id: string; nome: string; codigo: string } | null;
  client: { id: string; nome: string } | null;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function dayKey(isoDate: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(isoDate));
}

function monthNavHref(year: number, month: number) {
  let y = year;
  let m = month;
  if (m < 0) {
    m = 11;
    y -= 1;
  } else if (m > 11) {
    m = 0;
    y += 1;
  }
  return `/agenda?ano=${y}&mes=${m + 1}`;
}

export function AgendaCalendar({
  year,
  month,
  events,
}: {
  year: number;
  month: number;
  events: AgendaEventListItem[];
}) {
  const eventsByDay = new Map<string, AgendaEventListItem[]>();
  for (const event of events) {
    const key = dayKey(event.inicio);
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(key);
  }

  const sortedDays = [...eventsByDay.keys()].sort();

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Card className="lg:w-80 lg:shrink-0">
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" render={<Link href={monthNavHref(year, month - 1)} />} nativeButton={false}>
              <ChevronLeft />
            </Button>
            <span className="font-semibold">
              {MONTH_NAMES[month]} {year}
            </span>
            <Button variant="ghost" size="icon-sm" render={<Link href={monthNavHref(year, month + 1)} />} nativeButton={false}>
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((weekday, index) => (
              <div key={index}>{weekday}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((key, index) => {
              if (!key) return <div key={index} />;
              const dayEvents = eventsByDay.get(key) ?? [];
              const hasCancelled = dayEvents.some((e) => e.status === "CANCELADO");
              const hasConfirmed = dayEvents.some((e) => e.status === "CONFIRMADO");
              const day = Number(key.slice(8, 10));
              return (
                <a
                  key={key}
                  href={dayEvents.length ? `#dia-${key}` : undefined}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-full text-sm transition-colors",
                    dayEvents.length ? "cursor-pointer font-medium hover:opacity-80" : "text-muted-foreground/40",
                    hasConfirmed ? "bg-brand-teal/15 text-brand-teal" : hasCancelled ? "bg-muted text-muted-foreground" : "",
                  )}
                >
                  {day}
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-1 flex-col gap-4">
        {sortedDays.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum compromisso neste mês.
            </CardContent>
          </Card>
        ) : (
          sortedDays.map((key) => {
            const dayEvents = (eventsByDay.get(key) ?? []).slice().sort((a, b) => a.inicio.localeCompare(b.inicio));
            const label = new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              weekday: "long",
              day: "2-digit",
              month: "long",
            }).format(new Date(`${key}T12:00:00-03:00`));
            return (
              <div key={key} id={`dia-${key}`} className="flex flex-col gap-2 scroll-mt-4">
                <h3 className="text-sm font-semibold capitalize text-muted-foreground">{label}</h3>
                <div className="flex flex-col gap-2">
                  {dayEvents.map((event) => (
                    <Card key={event.id} className={cn(event.status === "CANCELADO" && "opacity-60")}>
                      <CardContent className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("text-sm font-medium", event.status === "CANCELADO" && "line-through")}>
                              {event.titulo}
                            </span>
                            {event.origem === "WHATSAPP" ? (
                              <Badge variant="success">
                                <MessageCircle /> WhatsApp
                              </Badge>
                            ) : null}
                            {event.status === "CANCELADO" ? <Badge variant="destructive">Cancelado</Badge> : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {event.diaTodo
                                ? "Dia inteiro"
                                : new Intl.DateTimeFormat("pt-BR", {
                                    timeZone: "America/Sao_Paulo",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }).format(new Date(event.inicio))}
                            </span>
                            {event.local ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3" /> {event.local}
                              </span>
                            ) : null}
                            {event.work ? <span>Obra: {event.work.codigo}</span> : null}
                            {event.client ? <span>Cliente: {event.client.nome}</span> : null}
                          </div>
                        </div>
                        <AgendaEventActions eventId={event.id} status={event.status} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
