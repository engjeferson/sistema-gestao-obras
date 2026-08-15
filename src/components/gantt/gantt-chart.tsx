"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { ChevronDown, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePlanningTaskDates, updateStageName, updateTaskName } from "@/server/actions/planejamento";
import { TaskPredecessorsCell } from "@/components/planejamento/task-predecessors-cell";
import type { PlainStage, PlainTask, TaskOption } from "@/components/planejamento/stage-list";
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

const STATUS_COLORS: Record<string, string> = {
  NAO_INICIADA: "bg-muted-foreground/40",
  EM_ANDAMENTO: "bg-warning",
  CONCLUIDA: "bg-success",
  ATRASADA: "bg-destructive",
};

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 34;
const LEFT_GRID = "44px minmax(160px,1fr) 92px 92px 56px 150px";
const LEFT_WIDTH = 44 + 160 + 92 + 92 + 56 + 150;
const ZOOM_LEVELS = [8, 14, 22, 34, 50];

type Row =
  | { type: "stage"; stage: PlainStage; start: Date; end: Date }
  | { type: "task"; task: PlainTask; stage: PlainStage };

function EditableName({
  value,
  bold,
  onCommit,
}: {
  value: string;
  bold?: boolean;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const trimmed = draft.trim();
          if (trimmed && trimmed !== value) onCommit(trimmed);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full rounded border px-1 py-0.5 text-xs"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title={value}
      className={`w-full truncate text-left hover:underline ${bold ? "font-semibold" : ""}`}
    >
      {value}
    </button>
  );
}

export function GanttChart({
  stages,
  workId,
  allTasks,
}: {
  stages: PlainStage[];
  workId: string;
  allTasks: TaskOption[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoomIndex, setZoomIndex] = useState(2);
  const [fullscreen, setFullscreen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const allTasksFlat = useMemo(() => stages.flatMap((s) => s.tasks), [stages]);
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
    const list: Row[] = [];
    for (const stage of stages) {
      const starts = stage.tasks.map((t) => t.dataInicioPrevista.getTime());
      const ends = stage.tasks.map((t) => t.dataFimPrevista.getTime());
      const start = starts.length ? new Date(Math.min(...starts)) : new Date();
      const end = ends.length ? new Date(Math.max(...ends)) : new Date();
      list.push({ type: "stage", stage, start, end });
      if (!collapsed.has(stage.id)) {
        for (const task of stage.tasks) {
          list.push({ type: "task", task, stage });
        }
      }
    }
    return list;
  }, [stages, collapsed]);

  const taskRowIndex = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, i) => {
      if (row.type === "task") map.set(row.task.id, i);
    });
    return map;
  }, [rows]);

  const taskById = useMemo(() => {
    const map = new Map<string, PlainTask>();
    for (const task of allTasksFlat) map.set(task.id, task);
    return map;
  }, [allTasksFlat]);

  const arrows = useMemo(() => {
    const list: { id: string; path: string }[] = [];
    for (const row of rows) {
      if (row.type !== "task") continue;
      const succIndex = taskRowIndex.get(row.task.id);
      if (succIndex === undefined) continue;
      for (const pred of row.task.predecessors) {
        const predIndex = taskRowIndex.get(pred.taskId);
        const predTask = taskById.get(pred.taskId);
        if (predIndex === undefined || !predTask) continue;

        const predRight = xForDate(predTask.dataFimPrevista) + pxPerDay;
        const predY = predIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const succLeft = xForDate(row.task.dataInicioPrevista);
        const succY = succIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

        let path: string;
        if (succLeft - 12 >= predRight) {
          const midX = (predRight + succLeft) / 2;
          path = `M ${predRight} ${predY} H ${midX} V ${succY} H ${succLeft - 4}`;
        } else {
          const detourY = succY < predY ? succY - 16 : succY + 16;
          path = `M ${predRight} ${predY} H ${predRight + 10} V ${detourY} H ${succLeft - 10} V ${succY} H ${succLeft - 4}`;
        }
        list.push({ id: `${pred.taskId}-${row.task.id}`, path });
      }
    }
    return list;
  }, [rows, taskRowIndex, taskById, pxPerDay, rangeStart]);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayX = xForDate(today);
  const showTodayLine = todayX >= 0 && todayX <= timelineWidth;

  function handleDateChange(task: PlainTask, field: "start" | "end", value: string) {
    if (!value) return;
    const start = field === "start" ? value : task.dataInicioPrevista.toISOString().slice(0, 10);
    const end = field === "end" ? value : task.dataFimPrevista.toISOString().slice(0, 10);
    startTransition(async () => {
      await updatePlanningTaskDates(task.id, workId, start, end);
      toast.success("Datas atualizadas.");
      router.refresh();
    });
  }

  function handleDurationChange(task: PlainTask, value: string) {
    const duration = Math.max(1, Number(value) || 1);
    const start = task.dataInicioPrevista;
    const newEnd = addDays(start, duration - 1);
    startTransition(async () => {
      await updatePlanningTaskDates(task.id, workId, toDateInputValue(start), toDateInputValue(newEnd));
      toast.success("Duração atualizada.");
      router.refresh();
    });
  }

  function handleRenameStage(stageId: string, nome: string) {
    startTransition(async () => {
      await updateStageName(stageId, workId, nome);
      toast.success("Etapa renomeada.");
      router.refresh();
    });
  }

  function handleRenameTask(taskId: string, nome: string) {
    startTransition(async () => {
      await updateTaskName(taskId, workId, nome);
      toast.success("Atividade renomeada.");
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
        Nenhuma atividade cadastrada ainda.
      </p>
    );
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col gap-3 overflow-auto bg-background p-4" : "flex flex-col gap-3"}>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set(stages.map((s) => s.id)))}>
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
                <span>Atividade</span>
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
                      <span />
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
                    <span className="pl-4 text-muted-foreground">{task.codigo}</span>
                    <div className="pl-4">
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
                    <TaskPredecessorsCell
                      taskId={task.id}
                      workId={workId}
                      predecessors={task.predecessors}
                      allTasks={allTasks}
                    />
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
                      return (
                        <div
                          key={row.stage.id}
                          className="absolute flex items-center rounded-md bg-brand-navy px-2 text-[0.65rem] font-medium text-white"
                          style={{ top: i * ROW_HEIGHT + 8, height: ROW_HEIGHT - 16, left, width: Math.max(width, 4) }}
                        >
                          {row.stage.nome}
                        </div>
                      );
                    }

                    const task = row.task;
                    const left = xForDate(task.dataInicioPrevista);
                    const width = (differenceInCalendarDays(task.dataFimPrevista, task.dataInicioPrevista) + 1) * pxPerDay;
                    return (
                      <div
                        key={task.id}
                        className="absolute overflow-hidden rounded-md bg-muted"
                        style={{ top: i * ROW_HEIGHT + 9, height: ROW_HEIGHT - 18, left, width: Math.max(width, 4) }}
                        title={`${task.nome} — ${PLANNING_STATUS_LABELS[task.status]}`}
                      >
                        <div
                          className={`h-full ${STATUS_COLORS[task.status] ?? "bg-muted-foreground/40"}`}
                          style={{ width: `${Math.min(Number(task.percentualExecutado), 100)}%` }}
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
