"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, differenceInCalendarDays, eachWeekOfInterval, eachMonthOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { updatePlanningTaskDates } from "@/server/actions/planejamento";
import { PLANNING_STATUS_LABELS } from "@/lib/status-labels";

export type GanttTask = {
  id: string;
  nome: string;
  etapaNome: string;
  dataInicioPrevista: Date;
  dataFimPrevista: Date;
  percentualExecutado: number;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  NAO_INICIADA: "bg-muted-foreground/40",
  EM_ANDAMENTO: "bg-warning",
  CONCLUIDA: "bg-success",
  ATRASADA: "bg-destructive",
};

export function GanttChart({ tasks, workId }: { tasks: GanttTask[]; workId: string }) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { rangeStart, rangeEnd, totalDays, markers } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { rangeStart: today, rangeEnd: addDays(today, 30), totalDays: 30, markers: [] as Date[] };
    }
    const starts = tasks.map((t) => t.dataInicioPrevista.getTime());
    const ends = tasks.map((t) => t.dataFimPrevista.getTime());
    const start = addDays(new Date(Math.min(...starts)), -3);
    const end = addDays(new Date(Math.max(...ends)), 3);
    const days = Math.max(differenceInCalendarDays(end, start) + 1, 1);
    const markerDates =
      viewMode === "week"
        ? eachWeekOfInterval({ start, end }, { locale: ptBR })
        : eachMonthOfInterval({ start, end });
    return { rangeStart: start, rangeEnd: end, totalDays: days, markers: markerDates };
  }, [tasks, viewMode]);

  function positionStyle(taskStart: Date, taskEnd: Date) {
    const left = (differenceInCalendarDays(taskStart, rangeStart) / totalDays) * 100;
    const width = ((differenceInCalendarDays(taskEnd, taskStart) + 1) / totalDays) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
  }

  function handleDateChange(taskId: string, field: "start" | "end", value: string, task: GanttTask) {
    if (!value) return;
    const start = field === "start" ? value : task.dataInicioPrevista.toISOString().slice(0, 10);
    const end = field === "end" ? value : task.dataFimPrevista.toISOString().slice(0, 10);
    startTransition(async () => {
      await updatePlanningTaskDates(taskId, workId, start, end);
      toast.success("Datas atualizadas.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>
          Semana
        </Button>
        <Button variant={viewMode === "month" ? "default" : "outline"} size="sm" onClick={() => setViewMode("month")}>
          Mês
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma atividade cadastrada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <div className="grid min-w-[900px] grid-cols-[240px_1fr]">
            <div className="border-r border-b bg-muted/30 p-2 text-xs font-medium text-muted-foreground">
              Atividade
            </div>
            <div className="relative border-b bg-muted/30">
              <div className="relative h-8">
                {markers.map((marker, i) => (
                  <span
                    key={i}
                    className="absolute top-1 text-xs text-muted-foreground"
                    style={{ left: `${(differenceInCalendarDays(marker, rangeStart) / totalDays) * 100}%` }}
                  >
                    {format(marker, viewMode === "week" ? "dd/MM" : "MMM/yy", { locale: ptBR })}
                  </span>
                ))}
              </div>
            </div>

            {tasks.map((task) => (
              <div key={task.id} className="contents">
                <div className="flex flex-col justify-center gap-0.5 border-r border-b p-2">
                  <span className="text-sm font-medium">{task.nome}</span>
                  <span className="text-xs text-muted-foreground">{task.etapaNome}</span>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <input
                      type="date"
                      defaultValue={task.dataInicioPrevista.toISOString().slice(0, 10)}
                      disabled={isPending}
                      onChange={(e) => handleDateChange(task.id, "start", e.target.value, task)}
                      className="w-[110px] rounded border px-1 py-0.5 text-xs"
                    />
                    <span>→</span>
                    <input
                      type="date"
                      defaultValue={task.dataFimPrevista.toISOString().slice(0, 10)}
                      disabled={isPending}
                      onChange={(e) => handleDateChange(task.id, "end", e.target.value, task)}
                      className="w-[110px] rounded border px-1 py-0.5 text-xs"
                    />
                  </div>
                </div>
                <div className="relative border-b py-3">
                  <div
                    className="absolute h-6 overflow-hidden rounded-md bg-muted"
                    style={positionStyle(task.dataInicioPrevista, task.dataFimPrevista)}
                    title={`${task.nome} — ${PLANNING_STATUS_LABELS[task.status]}`}
                  >
                    <div
                      className={`h-full ${STATUS_COLORS[task.status] ?? "bg-muted-foreground/40"}`}
                      style={{ width: `${Math.min(task.percentualExecutado, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
