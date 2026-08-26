"use client";

import { forwardRef, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, differenceInCalendarDays } from "date-fns";
import { addPlanningDependencyByCode, updatePlanningTaskDates, type PredecessorChip } from "@/server/actions/planejamento";
import type { PlainTask, PlanningRow } from "@/components/planejamento/stage-list";
import { isWorkingDay, type WorkCalendar } from "@/lib/schedule-dates";
import { PLANNING_STATUS_LABELS } from "@/lib/status-labels";

// As datas do planejamento são meia-noite UTC (@db.Date). Formatar com timeZone "UTC" explícito
// evita que o horário local do navegador (ex: America/Sao_Paulo, UTC-3) exiba o dia anterior.
function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit" }).format(date);
}
function formatMonthLabel(date: Date) {
  const month = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" }).format(date).replace(".", "");
  const year = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", year: "2-digit" }).format(date);
  return `${month}/${year}`;
}
function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const ROW_HEIGHT = 40;
export const HEADER_HEIGHT = 34;

type DragMode = "move" | "resize-start" | "resize-end";
type DragState = { taskId: string; mode: DragMode; startClientX: number; originalStart: Date; originalEnd: Date };
type ConnectDragState = { sourceTaskId: string; sourceCode: string; startX: number; startY: number; currentX: number; currentY: number };

export function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Metade direita do editor de planejamento (linha do tempo) — extraída do antigo gantt-chart.tsx
 * pra virar só a parte visual do Gantt, recebendo `rows`/zoom/faixa de datas já calculados pelo
 * orquestrador (planning-editor.tsx), que é quem também alimenta o painel de tabela com a MESMA
 * lista — garante que as duas metades fiquem sempre na mesma linha.
 */
export const GanttCanvas = forwardRef<
  HTMLDivElement,
  {
    rows: PlanningRow[];
    workId: string;
    rangeStart: Date;
    totalDays: number;
    pxPerDay: number;
    calendar: WorkCalendar;
  }
>(function GanttCanvas({ rows, workId, rangeStart, totalDays, pxPerDay, calendar }, scrollRef) {
  const [isPending, startTransition] = useTransition();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ start: Date; end: Date } | null>(null);
  const dragPreviewRef = useRef<{ start: Date; end: Date } | null>(null);
  const [connectDrag, setConnectDrag] = useState<ConnectDragState | null>(null);
  const connectDragRef = useRef<ConnectDragState | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const timelineWidth = totalDays * pxPerDay;

  function xForDate(date: Date) {
    return differenceInCalendarDays(date, rangeStart) * pxPerDay;
  }

  const days = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < totalDays; i++) out.push(addDays(rangeStart, i));
    return out;
  }, [rangeStart, totalDays]);

  const taskRowIndex = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, i) => {
      if (row.type === "task") map.set(row.task.id, i);
    });
    return map;
  }, [rows]);

  const stageRowInfo = useMemo(() => {
    const map = new Map<string, { index: number; start: Date; end: Date }>();
    rows.forEach((row, i) => {
      if (row.type === "stage") map.set(row.stage.id, { index: i, start: row.start, end: row.end });
    });
    return map;
  }, [rows]);

  const taskById = useMemo(() => {
    const map = new Map<string, PlainTask>();
    for (const row of rows) if (row.type === "task") map.set(row.task.id, row.task);
    return map;
  }, [rows]);

  // Setas de dependência — predecessora e dona podem ser tanto Atividade quanto Etapa/Sub (usa o
  // fim/início agregado da etapa quando for o caso). Só desenha entre linhas visíveis.
  const arrows = useMemo(() => {
    const list: { id: string; path: string }[] = [];

    function predecessorAnchor(chip: PredecessorChip): { index: number; endDate: Date } | null {
      if (chip.type === "task") {
        const index = taskRowIndex.get(chip.id);
        const task = taskById.get(chip.id);
        if (index === undefined || !task) return null;
        return { index, endDate: task.dataFimPrevista };
      }
      const info = stageRowInfo.get(chip.id);
      return info ? { index: info.index, endDate: info.end } : null;
    }

    function drawArrow(chip: PredecessorChip, ownerIndex: number, ownerStart: Date, ownerKey: string) {
      const pred = predecessorAnchor(chip);
      if (!pred) return;
      const predRight = xForDate(pred.endDate) + pxPerDay;
      const predY = pred.index * ROW_HEIGHT + ROW_HEIGHT / 2;
      const succLeft = xForDate(ownerStart);
      const succY = ownerIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      let path: string;
      if (succLeft - 12 >= predRight) {
        const midX = (predRight + succLeft) / 2;
        path = `M ${predRight} ${predY} H ${midX} V ${succY} H ${succLeft - 4}`;
      } else {
        const detourY = succY < predY ? succY - 16 : succY + 16;
        path = `M ${predRight} ${predY} H ${predRight + 10} V ${detourY} H ${succLeft - 10} V ${succY} H ${succLeft - 4}`;
      }
      list.push({ id: `${chip.type}-${chip.id}-${ownerKey}`, path });
    }

    for (const row of rows) {
      if (row.type === "task") {
        const ownerIndex = taskRowIndex.get(row.task.id);
        if (ownerIndex === undefined) continue;
        for (const chip of row.task.predecessorChips) {
          drawArrow(chip, ownerIndex, row.task.dataInicioPrevista, `task-${row.task.id}`);
        }
      } else {
        const info = stageRowInfo.get(row.stage.id);
        if (!info) continue;
        for (const chip of row.stage.predecessorChips) {
          drawArrow(chip, info.index, info.start, `stage-${row.stage.id}`);
        }
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, taskRowIndex, taskById, stageRowInfo, pxPerDay, rangeStart]);

  const today = todayUTC();
  const todayX = xForDate(today);
  const showTodayLine = todayX >= 0 && todayX <= timelineWidth;

  function commitTaskDates(taskId: string, start: Date, end: Date) {
    startTransition(async () => {
      await updatePlanningTaskDates(taskId, workId, toDateInputValue(start), toDateInputValue(end));
      toast.success("Datas atualizadas.");
      router.refresh();
    });
  }

  // Arrastar (mover) ou redimensionar (bordas) uma barra de atividade na linha do tempo.
  useEffect(() => {
    if (!drag) return;
    const activeDrag = drag;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = activeDrag.mode === "move" ? "grabbing" : "ew-resize";
    document.body.style.userSelect = "none";

    function onMove(e: PointerEvent) {
      const deltaPx = e.clientX - activeDrag.startClientX;
      const deltaDays = Math.round(deltaPx / pxPerDay);
      let next: { start: Date; end: Date } | null = null;
      if (activeDrag.mode === "move") {
        next = { start: addDays(activeDrag.originalStart, deltaDays), end: addDays(activeDrag.originalEnd, deltaDays) };
      } else if (activeDrag.mode === "resize-start") {
        const newStart = addDays(activeDrag.originalStart, deltaDays);
        if (newStart.getTime() <= activeDrag.originalEnd.getTime()) next = { start: newStart, end: activeDrag.originalEnd };
      } else {
        const newEnd = addDays(activeDrag.originalEnd, deltaDays);
        if (newEnd.getTime() >= activeDrag.originalStart.getTime()) next = { start: activeDrag.originalStart, end: newEnd };
      }
      if (next) {
        dragPreviewRef.current = next;
        setDragPreview(next);
      }
    }

    function onUp() {
      const finalPreview = dragPreviewRef.current;
      dragPreviewRef.current = null;
      setDrag(null);
      setDragPreview(null);
      if (finalPreview) {
        commitTaskDates(activeDrag.taskId, finalPreview.start, finalPreview.end);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, pxPerDay, workId]);

  // Criar dependência arrastando do ponto de conexão (borda direita da barra) até outra barra —
  // solta fora de qualquer barra cancela sem chamar o servidor. Reaproveita a mesma action já
  // usada pelo seletor de predecessoras da tabela (resolve pelo código da atividade de origem).
  useEffect(() => {
    if (!connectDrag) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";

    function onMove(e: PointerEvent) {
      const body = bodyRef.current;
      if (!body) return;
      const rect = body.getBoundingClientRect();
      setConnectDrag((prev) => (prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : prev));
    }

    function onUp(e: PointerEvent) {
      const active = connectDragRef.current;
      setConnectDrag(null);
      if (!active) return;
      const body = bodyRef.current;
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const rowIndex = Math.floor(relY / ROW_HEIGHT);
      const targetRow = rows[rowIndex];
      if (!targetRow || targetRow.type !== "task" || targetRow.task.id === active.sourceTaskId) return;

      const relX = e.clientX - rect.left;
      const barLeft = xForDate(targetRow.task.dataInicioPrevista);
      const barWidth = (differenceInCalendarDays(targetRow.task.dataFimPrevista, targetRow.task.dataInicioPrevista) + 1) * pxPerDay;
      if (relX < barLeft || relX > barLeft + barWidth) return;

      startTransition(async () => {
        try {
          await addPlanningDependencyByCode(workId, active.sourceCode, null, targetRow.task.id);
          toast.success("Predecessora criada.");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Não foi possível criar a dependência.");
        }
      });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = previousCursor;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectDrag, rows, pxPerDay, workId]);

  useEffect(() => {
    connectDragRef.current = connectDrag;
  }, [connectDrag]);

  return (
    <div ref={scrollRef} className="h-full overflow-x-auto">
      <div style={{ width: timelineWidth }}>
        <div className="sticky top-0 z-10 flex border-b bg-muted/40" style={{ height: HEADER_HEIGHT }}>
          {days.map((day, i) => {
            const isMonthStart = day.getUTCDate() === 1 || i === 0;
            return (
              <div
                key={i}
                className="flex shrink-0 flex-col items-center justify-center border-r text-[0.6rem] text-muted-foreground"
                style={{ width: pxPerDay }}
              >
                <span className="h-3 font-semibold text-foreground">{isMonthStart ? formatMonthLabel(day) : ""}</span>
                <span>{pxPerDay >= 20 ? formatDayLabel(day) : ""}</span>
              </div>
            );
          })}
        </div>

        <div ref={bodyRef} className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
          {showTodayLine ? (
            <div className="absolute top-0 bottom-0 w-px bg-destructive/60" style={{ left: todayX }} title="Hoje" />
          ) : null}

          {days.map((day, i) => (
            <div
              key={i}
              className={`absolute top-0 bottom-0 border-r border-border/60 ${!isWorkingDay(day, calendar) ? "bg-muted-foreground/[0.06]" : ""}`}
              style={{ left: i * pxPerDay, width: pxPerDay }}
            />
          ))}

          <svg className="pointer-events-none absolute top-0 left-0" width={timelineWidth} height={rows.length * ROW_HEIGHT}>
            <defs>
              <marker id="gantt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
              </marker>
            </defs>
            {arrows.map((arrow) => (
              <path
                key={arrow.id}
                d={arrow.path}
                fill="none"
                className="stroke-muted-foreground/70"
                strokeWidth={1.5}
                markerEnd="url(#gantt-arrow)"
              />
            ))}
          </svg>

          {rows.map((row, i) => {
            if (row.type === "stage") {
              const left = xForDate(row.start);
              const width = (differenceInCalendarDays(row.end, row.start) + 1) * pxPerDay;
              const opacity = Math.max(0.55, 1 - row.depth * 0.15);
              return (
                <div
                  key={row.stage.id}
                  className="absolute flex items-center rounded-md bg-brand-navy px-2 text-[0.65rem] font-medium text-white"
                  style={{ top: i * ROW_HEIGHT + 8, height: ROW_HEIGHT - 16, left, width: Math.max(width, 4), opacity }}
                >
                  {row.stage.nome}
                </div>
              );
            }

            const task = row.task;
            const isDragging = drag?.taskId === task.id && dragPreview;
            const barStart = isDragging ? dragPreview!.start : task.dataInicioPrevista;
            const barEnd = isDragging ? dragPreview!.end : task.dataFimPrevista;
            const left = xForDate(barStart);
            const width = (differenceInCalendarDays(barEnd, barStart) + 1) * pxPerDay;
            const progressPct = Math.min(Math.max(Number(task.percentualExecutado), 0), 100);
            const remainderColor = task.status === "ATRASADA" ? "bg-destructive" : "bg-warning";
            const barTop = i * ROW_HEIGHT + 9;
            const barHeight = ROW_HEIGHT - 18;
            return (
              <div key={task.id} className="group contents">
              <div
                className={`absolute cursor-grab overflow-hidden rounded-md select-none ${isDragging ? "ring-2 ring-brand-teal" : ""}`}
                style={{ top: barTop, height: barHeight, left, width: Math.max(width, 4) }}
                title={`${task.nome} — ${PLANNING_STATUS_LABELS[task.status]} (${progressPct.toFixed(0)}%)`}
                onPointerDown={(e) => {
                  if (isPending || drag) return;
                  e.preventDefault();
                  setDrag({
                    taskId: task.id,
                    mode: "move",
                    startClientX: e.clientX,
                    originalStart: task.dataInicioPrevista,
                    originalEnd: task.dataFimPrevista,
                  });
                }}
              >
                <div className="flex h-full w-full">
                  <div className="h-full bg-success" style={{ width: `${progressPct}%` }} />
                  <div className={`h-full ${remainderColor}`} style={{ width: `${100 - progressPct}%` }} />
                </div>
                <div
                  className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (isPending || drag) return;
                    setDrag({
                      taskId: task.id,
                      mode: "resize-start",
                      startClientX: e.clientX,
                      originalStart: task.dataInicioPrevista,
                      originalEnd: task.dataFimPrevista,
                    });
                  }}
                />
                <div
                  className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (isPending || drag) return;
                    setDrag({
                      taskId: task.id,
                      mode: "resize-end",
                      startClientX: e.clientX,
                      originalStart: task.dataInicioPrevista,
                      originalEnd: task.dataFimPrevista,
                    });
                  }}
                />
              </div>
              <div
                className="absolute z-10 size-2.5 -translate-y-1/2 cursor-crosshair rounded-full border border-background bg-brand-teal opacity-0 group-hover:opacity-100"
                style={{ top: barTop + barHeight / 2, left: left + Math.max(width, 4) - 5 }}
                title="Arrastar para criar predecessora"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isPending || drag) return;
                  const body = bodyRef.current;
                  const rect = body?.getBoundingClientRect();
                  const x = rect ? e.clientX - rect.left : left + width;
                  const y = rect ? e.clientY - rect.top : barTop + barHeight / 2;
                  setConnectDrag({ sourceTaskId: task.id, sourceCode: task.codigo, startX: x, startY: y, currentX: x, currentY: y });
                }}
              />
              </div>
            );
          })}

          {connectDrag ? (
            <svg className="pointer-events-none absolute top-0 left-0 z-20" width={timelineWidth} height={rows.length * ROW_HEIGHT}>
              <line
                x1={connectDrag.startX}
                y1={connectDrag.startY}
                x2={connectDrag.currentX}
                y2={connectDrag.currentY}
                className="stroke-brand-teal"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
});
