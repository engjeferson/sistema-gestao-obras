"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays } from "date-fns";
import { ChevronsDownUp, ChevronsUpDown, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanningTablePane } from "@/components/planejamento/planning-table-pane";
import { GanttCanvas, todayUTC } from "@/components/gantt/gantt-canvas";
import { buildPlanningRows, collectAllTasks, flattenPredecessorOptions, type PlainStage } from "@/components/planejamento/stage-list";
import type { WorkCalendar } from "@/lib/schedule-dates";

const ZOOM_LEVELS = [8, 14, 22, 34, 50];
const DEFAULT_LEFT_WIDTH = 836;
const MIN_LEFT_WIDTH = 480;
const MAX_LEFT_WIDTH = 1200;
const LEFT_WIDTH_STORAGE_KEY = "planning-editor-left-width";

function readStoredLeftWidth(): number | null {
  try {
    const raw = window.localStorage.getItem(LEFT_WIDTH_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, parsed)) : null;
  } catch {
    return null;
  }
}

function collectStageIds(stages: PlainStage[]): string[] {
  return stages.flatMap((s) => [s.id, ...collectStageIds(s.children)]);
}

/**
 * Editor unificado de planejamento — tabela (esquerda) e Gantt (direita) lado a lado, alimentados
 * pela MESMA lista de linhas (`rows`), única fonte de estado: editar em qualquer um dos dois
 * painéis dispara a mesma server action + `router.refresh()`, e ambos re-renderizam a partir dos
 * mesmos dados do servidor.
 */
export function PlanningEditor({
  stages,
  workId,
  calendar,
}: {
  stages: PlainStage[];
  workId: string;
  calendar: WorkCalendar;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoomIndex, setZoomIndex] = useState(2);
  const [fullscreen, setFullscreen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const resizingRef = useRef(false);
  const ganttScrollRef = useRef<HTMLDivElement>(null);

  // Lido só depois da hidratação (client-only) — ler localStorage já no useState divergiria do
  // HTML gerado no servidor e quebraria a hidratação.
  useEffect(() => {
    const stored = readStoredLeftWidth();
    if (stored !== null) setLeftWidth(stored);
  }, []);

  const pxPerDay = ZOOM_LEVELS[zoomIndex];

  const rows = useMemo(() => buildPlanningRows(stages, collapsed), [stages, collapsed]);
  const predecessorOptions = useMemo(() => flattenPredecessorOptions(stages), [stages]);
  const allTasksFlat = useMemo(() => stages.flatMap(collectAllTasks), [stages]);

  const { rangeStart, totalDays } = useMemo(() => {
    if (allTasksFlat.length === 0) {
      const today = todayUTC();
      return { rangeStart: addDays(today, -3), totalDays: 30 };
    }
    const starts = allTasksFlat.map((t) => t.dataInicioPrevista.getTime());
    const ends = allTasksFlat.map((t) => t.dataFimPrevista.getTime());
    const start = addDays(new Date(Math.min(...starts)), -3);
    const end = addDays(new Date(Math.max(...ends)), 3);
    const days = Math.max(differenceInCalendarDays(end, start) + 1, 1);
    return { rangeStart: start, totalDays: days };
  }, [allTasksFlat]);

  function toggleCollapse(stageId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  function expandStage(stageId: string) {
    setCollapsed((prev) => {
      if (!prev.has(stageId)) return prev;
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }

  function goToToday() {
    const el = ganttScrollRef.current;
    if (!el) return;
    const todayX = differenceInCalendarDays(todayUTC(), rangeStart) * pxPerDay;
    el.scrollTo({ left: Math.max(0, todayX - el.clientWidth / 2), behavior: "smooth" });
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startWidth = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev: PointerEvent) {
      if (!resizingRef.current) return;
      const next = Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, startWidth + (ev.clientX - startX)));
      setLeftWidth(next);
    }
    function onUp() {
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setLeftWidth((current) => {
        try {
          window.localStorage.setItem(LEFT_WIDTH_STORAGE_KEY, String(current));
        } catch {
          // localStorage indisponível (modo privado etc.) — não é crítico, só perde a preferência.
        }
        return current;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col gap-2 bg-background p-4" : "flex flex-col gap-2"}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set(collectStageIds(stages)))}>
          <ChevronsDownUp /> Recolher tudo
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set())}>
          <ChevronsUpDown /> Expandir tudo
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
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

      {stages.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma etapa cadastrada ainda.
        </p>
      ) : (
        <div className={`overflow-hidden rounded-lg border ${fullscreen ? "flex-1" : "h-[calc(100vh-280px)] min-h-[420px]"}`}>
          <div className="flex h-full overflow-y-auto">
            <div className="shrink-0 overflow-x-auto border-r" style={{ width: leftWidth }}>
              <PlanningTablePane
                rows={rows}
                workId={workId}
                collapsed={collapsed}
                onToggleCollapse={toggleCollapse}
                onExpand={expandStage}
                predecessorOptions={predecessorOptions}
                calendar={calendar}
              />
            </div>
            <div
              onPointerDown={startResize}
              className="w-1.5 shrink-0 cursor-col-resize touch-none bg-border/60 hover:bg-brand-teal/60"
              title="Arrastar para redimensionar"
            />
            <div className="min-w-0 flex-1">
              <GanttCanvas
                ref={ganttScrollRef}
                rows={rows}
                workId={workId}
                rangeStart={rangeStart}
                totalDays={totalDays}
                pxPerDay={pxPerDay}
                calendar={calendar}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
