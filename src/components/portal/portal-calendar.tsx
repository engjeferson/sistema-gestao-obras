"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CloudSun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPhotoGallery } from "@/components/portal/portal-photo-gallery";
import { CLIMA_ICONS } from "@/components/rdo/clima-picker";
import { getPortalDayDetails } from "@/server/actions/portal";
import { formatDateBR } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

type RdoDay = { data: string; clima: string | null; semAtividade: boolean };

type DayDetail = Awaited<ReturnType<typeof getPortalDayDetails>>[number];

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

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function PortalCalendar({ token, rdoDays }: { token: string; rdoDays: RdoDay[] }) {
  const rdoDayMap = new Map(rdoDays.map((d) => [d.data, d]));
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<DayDetail[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (string | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toDateOnly(new Date(Date.UTC(year, month, d))));
  }

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(null);
    setDayDetails(null);
  }

  function handleDayClick(dateStr: string) {
    if (!rdoDayMap.has(dateStr)) return;
    setSelectedDate(dateStr);
    startTransition(async () => {
      const details = await getPortalDayDetails(token, dateStr);
      setDayDetails(details);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => changeMonth(-1)}>
            <ChevronLeft />
          </Button>
          <span>
            {MONTH_NAMES[month]} {year}
          </span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => changeMonth(1)}>
            <ChevronRight />
          </Button>
        </CardTitle>
        <CardDescription>Dias marcados têm registro de RDO — toque para ver.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((weekday, index) => (
            <div key={index}>{weekday}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((dateStr, index) => {
            if (!dateStr) return <div key={index} />;
            const dayInfo = rdoDayMap.get(dateStr);
            const hasRdo = !!dayInfo;
            const isSelected = dateStr === selectedDate;
            const day = Number(dateStr.slice(8, 10));
            const ClimaIcon = dayInfo?.clima ? CLIMA_ICONS[dayInfo.clima] : null;
            return (
              <button
                key={dateStr}
                type="button"
                disabled={!hasRdo}
                onClick={() => handleDayClick(dateStr)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-full text-sm transition-colors",
                  hasRdo ? "cursor-pointer font-medium hover:opacity-80" : "cursor-default text-muted-foreground/40",
                  hasRdo && !isSelected && dayInfo?.semAtividade ? "bg-destructive/15 text-destructive" : "",
                  hasRdo && !isSelected && !dayInfo?.semAtividade ? "bg-success/15 text-success" : "",
                  isSelected ? "bg-primary text-primary-foreground" : "",
                )}
              >
                {ClimaIcon ? <ClimaIcon className="size-3" /> : null}
                {day}
              </button>
            );
          })}
        </div>

        {selectedDate ? (
          <div className="flex flex-col gap-4 border-t pt-3">
            {isPending ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : dayDetails && dayDetails.length > 0 ? (
              dayDetails.map((rdo) => (
                <div key={rdo.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      RDO nº {rdo.numero} — {formatDateBR(selectedDate)}
                    </span>
                    <div className="flex items-center gap-2">
                      {rdo.semAtividade ? <Badge variant="destructive">Sem atividade</Badge> : null}
                      {rdo.clima ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CloudSun className="size-3.5" /> {rdo.clima}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {rdo.atividades.length > 0 ? (
                    <ul className="flex flex-col gap-2 text-sm">
                      {rdo.atividades.map((atividade, index) => (
                        <li key={index} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate font-medium">{atividade.atividadeNome}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {atividade.percentualAtual.toFixed(0)}%
                            </span>
                          </div>
                          {atividade.descricaoServico ? (
                            <p className="text-xs text-muted-foreground">{atividade.descricaoServico}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {rdo.ocorrencias.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {rdo.ocorrencias.map((ocorrencia, index) => (
                        <div key={index} className="text-sm">
                          <Badge variant="warning" className="mr-2">
                            {ocorrencia.tipoLabel}
                          </Badge>
                          {ocorrencia.descricao}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {rdo.observacoesGerais ? (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{rdo.observacoesGerais}</p>
                  ) : null}
                  {rdo.fotos.length > 0 ? <PortalPhotoGallery photos={rdo.fotos} /> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum registro nesse dia.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
