"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { ChevronDown, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePlanningTaskDates, updateStageName, updateTaskName, type PredecessorChip } from "@/server/actions/planejamento";
import { PredecessorsCell } from "@/components/planejamento/predecessors-cell";
import { EditableName } from "@/components/planejamento/editable-name";
import type { PlainStage, PlainTask } from "@/components/planejamento/stage-list";
import { PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";

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
function collectAllTasks(stage: PlainStage): PlainTask[] {
  return [...stage.tasks, ...stage.children.flatMap(collectAllTasks)];
}

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 34;
const INDENT = 14;
const LEFT_GRID = "44px minmax(160px,1fr) 92px 92px 56px 150px";
const LEFT_WIDTH = 44 + 160 + 92 + 92 + 56 + 150;
const ZOOM_LEVELS = [8, 14, 22, 34, 50];

type Row =
  | { type: "stage"; stage: PlainStage; start: Date; end: Date; depth: number }
  | { type: "task"; task: PlainTask; depth: number };

type DragMode = "move" | "resize-start" | "resize-end";
type DragState = { taskId: string; mode: DragMode; startClientX: number; originalStart: Date; originalEnd: Date };

function buildRows(stages: PlainStage[], depth: number, collapsed: Set<string>, out: Row[]) {
  for (const stage of stages) {
    const descendantTasks = collectAllTasks(stage);
    const starts = descendantTasks.map((t) => t.dataInicioPrevista.getTime());
    const ends = descendantTasks.map((t) => t.dataFimPrevista.getTime());
    const start = starts.length ? new Date(Math.min(...starts)) : (stage.dataInicioPrevista ?? new Date());
    const end = ends.length ? new Date(Math.max(...ends)) : (stage.dataFimPrevista ?? new Date());
    out.push({ type: "stage", stage, start, end, depth });
    if (!collapsed.has(stage.id)) {
      for (const task of stage.tasks) {
        out.push({ type: "task", task, depth: depth + 1 });
      }
      buildRows(stage.children, depth + 1, collapsed, out);
    }
  }
}

function collectStageIds(stages: PlainStage[]): string[] {
  return stages.flatMap((s) => [s.id, ...collectStageIds(s.children)]);
}

export function GanttChart({ stages, workId }: { stages: PlainStage[]; workId: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoomIndex, setZoomIndex] = useState(2);
  const [fullscreen, setFullscreen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ start: Date; end: Date } | null>(null);
  const dragPreviewRef = useRef<{ start: Date; end: Date } | null>(null);
  const router = useRouter();

  const allTasksFlat = useMemo(() => stages.flatMap(collectAllTasks), [stages]);
  const pxPerDay = ZOOM_LEVELS[zoomIndex];

  const { rangeStart, totalDays } = useMemo(() => {
    if (allTasksFlat.length === 0) {
      const today = new Date();
      return { rangeStart: today, totalDays: 30 };
    }
    const starts = allTasksFlat.map((t) => t.dataInicioPrevista.getTime());
    const ends = allTasksFlat.map((t) => t.dataFimPrevista.getTime());
    const start = addDays(new Date(Math.min(...starts)), -3);
    const end = addDays(new Date(Math.max(...ends)), 3);
    const days = Math.max(differenceInCalendarDays(end, start) + 1, 1);
    return { rangeStart: start, totalDays: days };
  }, [allTasksFlat]);

  const timelineWidth = totalDays * pxPerDay;
  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: addDays(rangeStart, totalDays - 1) }),
    [rangeStart, totalDays],
  );

  function xForDate(date: Date) {
    return differenceInCalendarDays(date, rangeStart) * pxPerDay;
  }

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    buildRows(stages, 0, collapsed, out);
    return out;
  }, [stages, collapsed]);

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
    for (const task of allTasksFlat) map.set(task.id, task);
    return map;
  }, [allTasksFlat]);

  // Setas de dependência — predecessora e dona podem ser tanto Item quanto Etapa/Sub (usa o
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
  }, [rows, taskRowIndex, taskById, stageRowInfo, pxPerDay, rangeStart]);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayX = xForDate(today);
  const showTodayLine = todayX >= 0 && todayX <= timelineWidth;

  function commitTaskDates(taskId: string, start: Date, end: Date) {
    startTransition(async () => {
      await updatePlanningTaskDates(taskId, workId, toDateInputValue(start), toDateInputValue(end));
      toast.success("Datas atualizadas.");
      router.refresh();
    });
  }

  // Arrastar (mover) ou redimensionar (bordas) uma barra de item na linha do tempo.
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

  function handleDateChange(task: PlainTask, field: "start" | "end", value: string) {
    if (!value) return;
    const start = field === "start" ? new Date(value) : task.dataInicioPrevista;
    const end = field === "end" ? new Date(value) : task.dataFimPrevista;
    commitTaskDates(task.id, start, end);
  }

  function handleDurationChange(task: PlainTask, value: string) {
    const duration = Math.max(1, Number(value) || 1);
    const newEnd = addDays(task.dataInicioPrevista, duration - 1);
    commitTaskDates(task.id, task.dataInicioPrevista, newEnd);
  }

  function handleRenameStage(stageId: string, nome: string) {
    startTransition(async () => {
      await updateStageName(stageId, workId, nome);
      toast.success("Renomeado.");
      router.refresh();
    });
  }

  function handleRenameTask(taskId: string, nome: string) {
    startTransition(async () => {
      await updateTaskName(taskId, workId, nome);
      toast.success("Item renomeado.");
      router.refresh();
    });
  }

  function toggleStage(stageId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  if (allTasksFlat.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum item cadastrado ainda.
      </p>
    );
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col gap-3 overflow-auto bg-background p-4" : "flex flex-col gap-3"}>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set(collectStageIds(stages)))}>
          Recolher tudo
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set())}>
          Expandir tudo
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={zoomIndex === 0}
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          title="Diminuir zoom"
        >
          <ZoomOut />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          title="Aumentar zoom"
        >
          <ZoomIn />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => setFullscreen((v) => !v)} title="Tela cheia">
          {fullscreen ? <Minimize2 /> : <Maximize2 />}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="max-h-[600px] overflow-y-auto">
          <div className="flex">
            {/* Painel planilha */}
            <div className="shrink-0 border-r" style={{ width: LEFT_WIDTH }}>
              <div
                className="sticky top-0 z-10 grid items-center border-b bg-muted/40 px-1 text-[0.65rem] font-medium text-muted-foreground uppercase"
                style={{ gridTemplateColumns: LEFT_GRID, height: HEADER_HEIGHT }}
              >
                <span>ID</span>
                <span>Etapa / Item</span>
                <span>Início</span>
                <span>Término</span>
                <span>Dias</span>
                <span>Predecessoras</span>
              </div>

              {rows.map((row) => {
                if (row.type === "stage") {
                  const isCollapsed = collapsed.has(row.stage.id);
                  return (
                    <div
                      key={row.stage.id}
                      className="grid items-center border-b bg-muted/20 px-1 text-xs"
                      style={{ gridTemplateColumns: LEFT_GRID, height: ROW_HEIGHT }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleStage(row.stage.id)}
                        className="flex items-center gap-0.5 text-muted-foreground"
                        style={{ paddingLeft: row.depth * INDENT }}
                      >
                        {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        {row.stage.codigo}
                      </button>
                      <EditableName
                        value={row.stage.nome}
                        bold
                        onCommit={(v) => handleRenameStage(row.stage.id, v)}
                      />
                      <span className="text-muted-foreground">{formatDateBR(row.start)}</span>
                      <span className="text-muted-foreground">{formatDateBR(row.end)}</span>
                      <span className="text-muted-foreground">
                        {differenceInCalendarDays(row.end, row.start) + 1}
                      </span>
                      <PredecessorsCell workId={workId} ownerStageId={row.stage.id} chips={row.stage.predecessorChips} />
                    </div>
                  );
                }

                const task = row.task;
                const duration = differenceInCalendarDays(task.dataFimPrevista, task.dataInicioPrevista) + 1;
                return (
                  <div
                    key={task.id}
                    className="grid items-center border-b px-1 text-xs"
                    style={{ gridTemplateColumns: LEFT_GRID, height: ROW_HEIGHT }}
                  >
                    <span className="text-muted-foreground" style={{ paddingLeft: row.depth * INDENT }}>
                      {task.codigo}
                    </span>
                    <div style={{ paddingLeft: row.depth * INDENT }}>
                      <EditableName value={task.nome} onCommit={(v) => handleRenameTask(task.id, v)} />
                    </div>
                    <input
                      type="date"
                      disabled={isPending}
                      value={task.dataInicioPrevista.toISOString().slice(0, 10)}
                      onChange={(e) => handleDateChange(task, "start", e.target.value)}
                      className="w-[86px] rounded border px-1 py-0.5 text-[0.7rem]"
                    />
                    <input
                      type="date"
                      disabled={isPending}
                      value={task.dataFimPrevista.toISOString().slice(0, 10)}
                      onChange={(e) => handleDateChange(task, "end", e.target.value)}
                      className="w-[86px] rounded border px-1 py-0.5 text-[0.7rem]"
                    />
                    <input
                      type="number"
                      min={1}
                      disabled={isPending}
                      defaultValue={duration}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== duration) handleDurationChange(task, e.target.value);
                      }}
                      className="w-[48px] rounded border px-1 py-0.5 text-[0.7rem]"
                    />
                    <PredecessorsCell workId={workId} ownerTaskId={task.id} chips={task.predecessorChips} />
                  </div>
                );
              })}
            </div>

            {/* Linha do tempo */}
            <div className="overflow-x-auto">
              <div style={{ width: timelineWidth }}>
                <div
                  className="sticky top-0 z-10 flex border-b bg-muted/40"
                  style={{ height: HEADER_HEIGHT }}
                >
                  {days.map((day, i) => {
                    const isMonthStart = day.getUTCDate() === 1 || i === 0;
                    return (
                      <div
                        key={i}
                        className="flex shrink-0 flex-col items-center justify-center border-r text-[0.6rem] text-muted-foreground"
                        style={{ width: pxPerDay }}
                      >
                        <span className="h-3 font-semibold text-foreground">
                          {isMonthStart ? formatMonthLabel(day) : ""}
                        </span>
                        <span>{pxPerDay >= 20 ? formatDayLabel(day) : ""}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
                  {showTodayLine ? (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-destructive/60"
                      style={{ left: todayX }}
                      title="Hoje"
                    />
                  ) : null}

                  {days.map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-border/60"
                      style={{ left: i * pxPerDay, width: pxPerDay }}
                    />
                  ))}

                  <svg
                    className="pointer-events-none absolute top-0 left-0"
                    width={timelineWidth}
                    height={rows.length * ROW_HEIGHT}
                  >
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
                          style={{
                            top: i * ROW_HEIGHT + 8,
                            height: ROW_HEIGHT - 16,
                            left,
                            width: Math.max(width, 4),
                            opacity,
                          }}
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
                    return (
                      <div
                        key={task.id}
                        className={`absolute cursor-grab overflow-hidden rounded-md select-none ${
                          isDragging ? "ring-2 ring-brand-teal" : ""
                        }`}
                        style={{ top: i * ROW_HEIGHT + 9, height: ROW_HEIGHT - 18, left, width: Math.max(width, 4) }}
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
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
