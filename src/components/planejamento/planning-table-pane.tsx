"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";
import { ChevronDown, ChevronRight, GripVertical, MoreVertical, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditableName } from "@/components/ui/editable-name";
import { PredecessorsCell } from "@/components/planejamento/predecessors-cell";
import {
  toDateInputValue,
  hasAnyTask,
  type PlainStage,
  type PlanningRow,
} from "@/components/planejamento/stage-list";
import { PLANNING_STATUS_BADGE, PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";
import { addWorkingDays, countWorkingDays, type WorkCalendar } from "@/lib/schedule-dates";
import {
  createStage,
  createTask,
  deleteStage,
  deleteTask,
  moveTaskToStage,
  reorderChildren,
  updatePlanningTaskDates,
  updateStageDates,
  updateStageName,
  updateStageProgress,
  updateTaskName,
} from "@/server/actions/planejamento";
import { ROW_HEIGHT, HEADER_HEIGHT } from "@/components/gantt/gantt-canvas";

const GRID = "28px 52px minmax(180px,1fr) 104px 104px 58px 58px 104px 190px 32px";

type PendingRow = { kind: "stage" | "task"; groupId: string | null };
type AugRow = PlanningRow | { type: "pending"; kind: "stage" | "task"; groupId: string | null };

function withPendingRow(rows: PlanningRow[], pending: PendingRow | null): AugRow[] {
  if (!pending) return rows;
  if (pending.groupId === null) {
    return [...rows, { type: "pending", kind: pending.kind, groupId: null }];
  }
  const stageIndex = rows.findIndex((r) => r.type === "stage" && r.stage.id === pending.groupId);
  if (stageIndex === -1) return rows;
  const stageDepth = rows[stageIndex].depth;
  let insertAt = stageIndex + 1;
  while (insertAt < rows.length && rows[insertAt].depth > stageDepth) insertAt++;
  const out: AugRow[] = [...rows];
  out.splice(insertAt, 0, { type: "pending", kind: pending.kind, groupId: pending.groupId });
  return out;
}

function rowId(row: PlanningRow): string {
  return row.type === "stage" ? row.stage.id : row.task.id;
}

export function PlanningTablePane({
  rows,
  workId,
  collapsed,
  onToggleCollapse,
  onExpand,
  predecessorOptions,
  calendar,
  criticalPath,
}: {
  rows: PlanningRow[];
  workId: string;
  collapsed: Set<string>;
  onToggleCollapse: (stageId: string) => void;
  onExpand: (stageId: string) => void;
  predecessorOptions: { value: string; label: string }[];
  calendar: WorkCalendar;
  criticalPath: Map<string, boolean> | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingRow | null>(null);

  function startCreate(kind: "stage" | "task", groupId: string | null) {
    if (groupId) onExpand(groupId);
    setPending({ kind, groupId });
  }

  function handleCreateStage(groupId: string | null, nome: string) {
    const fd = new FormData();
    fd.set("workId", workId);
    if (groupId) fd.set("parentId", groupId);
    fd.set("nome", nome);
    createStage(undefined, fd).then((error) => {
      if (error) toast.error(error);
      else router.refresh();
    });
    setPending(null);
  }

  function handleCreateTask(stageId: string, nome: string) {
    const today = new Date().toISOString().slice(0, 10);
    const fd = new FormData();
    fd.set("workId", workId);
    fd.set("stageId", stageId);
    fd.set("nome", nome);
    fd.set("dataInicioPrevista", today);
    fd.set("dataFimPrevista", today);
    createTask(undefined, fd).then((error) => {
      if (error) toast.error(error);
      else router.refresh();
    });
    setPending(null);
  }

  // Reordenação por drag (Pointer Events, mesmo padrão já usado no Gantt) sobre a lista PLANA de
  // linhas — permite mover uma atividade pra outra etapa (o mecanismo antigo só via os irmãos do
  // próprio grupo). Arrastar dentro do MESMO grupo faz o preview em tempo real (splice); soltar
  // sobre outra etapa (só atividades) chama `moveTaskToStage` em vez de reordenar localmente.
  const rowById = useMemo(() => {
    const map = new Map<string, PlanningRow>();
    for (const row of rows) map.set(rowId(row), row);
    return map;
  }, [rows]);

  const [rowDrag, setRowDrag] = useState<{ id: string; kind: "stage" | "task"; originalGroupId: string | null } | null>(null);
  const [displayOrder, setDisplayOrder] = useState<string[] | null>(null);
  const [crossTarget, setCrossTarget] = useState<string | null>(null);
  const rowDragRef = useRef(rowDrag);
  const displayOrderRef = useRef(displayOrder);
  const crossTargetRef = useRef(crossTarget);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    rowDragRef.current = rowDrag;
    displayOrderRef.current = displayOrder;
    crossTargetRef.current = crossTarget;
  }, [rowDrag, displayOrder, crossTarget]);

  useEffect(() => {
    if (!rowDrag) return;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    function onMove(e: PointerEvent) {
      const drag = rowDragRef.current;
      if (!drag) return;
      for (const [id, el] of rowRefs.current) {
        if (id === drag.id) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
        const hovered = rowById.get(id);
        if (!hovered) break;
        const hoveredGroupId = hovered.type === "stage" ? hovered.groupId : hovered.groupId;
        const targetGroupId = drag.kind === "task" && hovered.type === "stage" ? hovered.stage.id : hoveredGroupId;

        if (targetGroupId === drag.originalGroupId) {
          setCrossTarget(null);
          setDisplayOrder((prev) => {
            if (!prev) return prev;
            const next = prev.filter((x) => x !== drag.id);
            next.splice(next.indexOf(id), 0, drag.id);
            return next;
          });
        } else if (drag.kind === "task") {
          setCrossTarget(targetGroupId);
        }
        break;
      }
    }

    function onUp() {
      const drag = rowDragRef.current;
      const finalCrossTarget = crossTargetRef.current;
      const finalOrder = displayOrderRef.current;
      setRowDrag(null);
      setDisplayOrder(null);
      setCrossTarget(null);
      if (!drag) return;

      if (drag.kind === "task" && finalCrossTarget && finalCrossTarget !== drag.originalGroupId) {
        moveTaskToStage(drag.id, workId, finalCrossTarget).then(() => {
          toast.success("Atividade movida.");
          router.refresh();
        });
        return;
      }

      if (!finalOrder) return;
      const groupIds = rows
        .filter((r) => (r.type === "stage" ? r.groupId : r.groupId) === drag.originalGroupId)
        .map(rowId);
      const newGroupOrder = finalOrder.filter((id) => groupIds.includes(id));
      if (JSON.stringify(newGroupOrder) === JSON.stringify(groupIds)) return;
      const kindById = new Map(rows.map((r) => [rowId(r), r.type] as const));
      const orderedItems = newGroupOrder.map((id) => ({ id, kind: kindById.get(id) ?? ("task" as const) }));
      reorderChildren(workId, drag.originalGroupId, orderedItems).then(() => router.refresh());
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [rowDrag, rowById, rows, workId, router]);

  function startDrag(row: PlanningRow) {
    setDisplayOrder(rows.map(rowId));
    setRowDrag({ id: rowId(row), kind: row.type, originalGroupId: row.type === "stage" ? row.groupId : row.groupId });
  }

  const orderedRows = useMemo(() => {
    if (!displayOrder) return rows;
    return displayOrder.map((id) => rowById.get(id)).filter((r): r is PlanningRow => !!r);
  }, [displayOrder, rowById, rows]);

  const augmented = withPendingRow(orderedRows, pending);

  return (
    <div className="flex h-full flex-col text-sm">
      <div className="mb-1">
        <Button variant="outline" size="sm" onClick={() => startCreate("stage", null)} disabled={!!pending}>
          <Plus /> Etapa
        </Button>
      </div>

      <div
        className="sticky top-0 z-10 grid items-center border-b bg-muted/40 px-1 text-[0.65rem] font-medium text-muted-foreground uppercase"
        style={{ gridTemplateColumns: GRID, height: HEADER_HEIGHT }}
      >
        <span />
        <span>ID</span>
        <span>Etapa / Atividade</span>
        <span>Início</span>
        <span>Término</span>
        <span>Dias</span>
        <span>%</span>
        <span>Status</span>
        <span>Predecessoras</span>
        <span />
      </div>

      <div className="flex-1 overflow-y-hidden">
        {augmented.map((row) =>
          row.type === "pending" ? (
            <PendingRowView
              key={`pending-${row.groupId ?? "root"}`}
              kind={row.kind}
              groupId={row.groupId}
              onCommitStage={(nome) => handleCreateStage(row.groupId, nome)}
              onCommitTask={(nome) => handleCreateTask(row.groupId!, nome)}
              onCancel={() => setPending(null)}
            />
          ) : row.type === "stage" ? (
            <StageRowView
              key={row.stage.id}
              row={row}
              workId={workId}
              collapsed={collapsed.has(row.stage.id)}
              onToggleCollapse={() => onToggleCollapse(row.stage.id)}
              isDragging={rowDrag?.id === row.stage.id}
              isCrossTarget={crossTarget === row.stage.id}
              predecessorOptions={predecessorOptions}
              rowRef={(el) => {
                if (el) rowRefs.current.set(row.stage.id, el);
                else rowRefs.current.delete(row.stage.id);
              }}
              onGripPointerDown={() => startDrag(row)}
              onAddTask={() => startCreate("task", row.stage.id)}
              onAddSubStage={() => startCreate("stage", row.stage.id)}
              calendar={calendar}
            />
          ) : (
            <TaskRowView
              key={row.task.id}
              row={row}
              workId={workId}
              isDragging={rowDrag?.id === row.task.id}
              predecessorOptions={predecessorOptions}
              rowRef={(el) => {
                if (el) rowRefs.current.set(row.task.id, el);
                else rowRefs.current.delete(row.task.id);
              }}
              onGripPointerDown={() => startDrag(row)}
              calendar={calendar}
              isCritical={criticalPath?.get(row.task.id) ?? false}
            />
          ),
        )}
      </div>
    </div>
  );
}

function PendingRowView({
  kind,
  onCommitStage,
  onCommitTask,
  onCancel,
}: {
  kind: "stage" | "task";
  groupId: string | null;
  onCommitStage: (nome: string) => void;
  onCommitTask: (nome: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid items-center border-b bg-accent/40 px-1" style={{ gridTemplateColumns: GRID, height: ROW_HEIGHT }}>
      <span />
      <span className="text-muted-foreground">…</span>
      <div className="col-span-8">
        <EditableName
          value=""
          autoEdit
          bold={kind === "stage"}
          placeholder={kind === "stage" ? "Nome da etapa..." : "Nome da atividade..."}
          onCommit={(nome) => (kind === "stage" ? onCommitStage(nome) : onCommitTask(nome))}
          onCancelAutoEdit={onCancel}
        />
      </div>
    </div>
  );
}

function GripCell({ onGripPointerDown }: { onGripPointerDown: () => void }) {
  return (
    <span
      onPointerDown={(e) => {
        e.preventDefault();
        onGripPointerDown();
      }}
      title="Arrastar para reordenar"
      className="flex touch-none cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
    >
      <GripVertical className="size-3.5" />
    </span>
  );
}

function StageRowView({
  row,
  workId,
  collapsed,
  onToggleCollapse,
  isDragging,
  isCrossTarget,
  predecessorOptions,
  rowRef,
  onGripPointerDown,
  onAddTask,
  onAddSubStage,
  calendar,
}: {
  row: Extract<PlanningRow, { type: "stage" }>;
  workId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isDragging: boolean;
  isCrossTarget: boolean;
  predecessorOptions: { value: string; label: string }[];
  rowRef: (el: HTMLDivElement | null) => void;
  onGripPointerDown: () => void;
  onAddTask: () => void;
  onAddSubStage: () => void;
  calendar: WorkCalendar;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const stage = row.stage;

  function handleRename(nome: string) {
    startTransition(async () => {
      await updateStageName(stage.id, workId, nome);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Excluir esta etapa/sub? Isso também apaga tudo dentro dela (subs e atividades). Essa ação não pode ser desfeita.")) {
      return;
    }
    startTransition(async () => {
      await deleteStage(stage.id, workId);
      toast.success("Etapa removida.");
      router.refresh();
    });
  }

  return (
    <div
      ref={rowRef}
      className={`grid items-center border-b px-1 transition-colors hover:bg-warning/10 focus-within:bg-warning/15 ${row.depth === 0 ? "bg-muted/40" : row.stripe ? "bg-muted/10" : "bg-background"} ${isDragging ? "opacity-50" : ""} ${isCrossTarget ? "ring-2 ring-inset ring-brand-teal" : ""}`}
      style={{ gridTemplateColumns: GRID, height: ROW_HEIGHT }}
    >
      <GripCell onGripPointerDown={onGripPointerDown} />
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center gap-0.5 text-xs text-muted-foreground"
        style={{ paddingLeft: row.depth * 14 }}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {stage.codigo}
      </button>
      <EditableName value={stage.nome} bold onCommit={handleRename} />
      <StageDateCells stage={stage} row={row} workId={workId} calendar={calendar} />
      <StageProgressCells stage={stage} workId={workId} />
      <PredecessorsCell
        workId={workId}
        ownerStageId={stage.id}
        ownCode={stage.codigo}
        chips={stage.predecessorChips}
        options={predecessorOptions}
        manualRef={stage.predecessorRef}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" disabled={isPending}>
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onAddTask}>+ Atividade</DropdownMenuItem>
          <DropdownMenuItem onClick={onAddSubStage}>+ Sub etapa</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Enquanto a etapa/sub não tem nenhuma atividade (nela ou em qualquer sub dela), a data é
// "manual" e editável direto aqui (inclusive a duração, que recalcula o Fim). A partir da
// primeira atividade lançada em qualquer nível, a data exibida vira sempre o agregado (menor
// início / maior fim, já calculado em `row.start`/`row.end`) — só leitura.
function StageDateCells({
  stage,
  row,
  workId,
  calendar,
}: {
  stage: PlainStage;
  row: Extract<PlanningRow, { type: "stage" }>;
  workId: string;
  calendar: WorkCalendar;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [start, setStart] = useState(stage.dataInicioPrevista ? toDateInputValue(stage.dataInicioPrevista) : "");
  const [end, setEnd] = useState(stage.dataFimPrevista ? toDateInputValue(stage.dataFimPrevista) : "");
  const [durationDraft, setDurationDraft] = useState<string | null>(null);

  useEffect(() => {
    setStart(stage.dataInicioPrevista ? toDateInputValue(stage.dataInicioPrevista) : "");
    setEnd(stage.dataFimPrevista ? toDateInputValue(stage.dataFimPrevista) : "");
  }, [stage.dataInicioPrevista, stage.dataFimPrevista]);

  if (hasAnyTask(stage)) {
    return (
      <>
        <span className="text-xs text-muted-foreground">{formatDateBR(row.start)}</span>
        <span className="text-xs text-muted-foreground">{formatDateBR(row.end)}</span>
        <span className="text-xs text-muted-foreground">—</span>
      </>
    );
  }

  function commit(nextStart: string, nextEnd: string) {
    if (!nextStart || !nextEnd) return;
    startTransition(async () => {
      await updateStageDates(stage.id, workId, nextStart, nextEnd);
      router.refresh();
    });
  }

  // Só dá pra digitar a duração (e calcular o Fim sozinho) quando já tem um Início — sem isso não
  // tem de onde contar os dias.
  function handleDurationChange(value: string) {
    setDurationDraft(value);
    const dias = Number(value);
    if (!start || !Number.isFinite(dias) || dias < 1) return;
    const nextEnd = toDateInputValue(addWorkingDays(new Date(start), dias - 1, calendar));
    setEnd(nextEnd);
    commit(start, nextEnd);
  }

  const duration = start && end ? countWorkingDays(new Date(start), new Date(end), calendar) : null;

  return (
    <>
      <input
        type="date"
        value={start}
        disabled={isPending}
        onChange={(e) => {
          setStart(e.target.value);
          commit(e.target.value, end);
        }}
        className="w-[98px] rounded border bg-background px-1 py-0.5 text-[0.7rem]"
      />
      <input
        type="date"
        value={end}
        disabled={isPending}
        onChange={(e) => {
          setEnd(e.target.value);
          commit(start, e.target.value);
        }}
        className="w-[98px] rounded border bg-background px-1 py-0.5 text-[0.7rem]"
      />
      <input
        type="number"
        min={1}
        disabled={!start}
        value={durationDraft ?? (duration !== null ? String(duration) : "")}
        title="Dias úteis, conforme o calendário da obra"
        onFocus={() => setDurationDraft(duration !== null ? String(duration) : "")}
        onChange={(e) => handleDurationChange(e.target.value)}
        onBlur={() => setDurationDraft(null)}
        className="w-14 rounded border bg-background px-1 py-0.5 text-[0.7rem]"
      />
    </>
  );
}

// Mesma regra da data: enquanto a etapa/sub não tem nenhuma atividade em nível nenhum, ela
// funciona como uma "atividade solta" — % editável direto aqui, com status sempre recalculado
// a partir dele (igual uma atividade, nunca escolhido manualmente). Com atividades lançadas, os
// dois campos ficam sem uso aqui (mostra só "—", igual já era antes).
function StageProgressCells({ stage, workId }: { stage: PlainStage; workId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [percent, setPercent] = useState(String(stage.percentualExecutado));

  useEffect(() => {
    setPercent(String(stage.percentualExecutado));
  }, [stage.percentualExecutado]);

  if (hasAnyTask(stage)) {
    return (
      <>
        <span className="text-xs text-muted-foreground">—</span>
        <span className="text-xs text-muted-foreground">—</span>
      </>
    );
  }

  function commit(value: string) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    startTransition(async () => {
      await updateStageProgress(stage.id, workId, n);
      router.refresh();
    });
  }

  return (
    <>
      <input
        type="number"
        min={0}
        max={100}
        disabled={isPending}
        value={percent}
        onChange={(e) => {
          setPercent(e.target.value);
          commit(e.target.value);
        }}
        className="w-14 rounded border bg-background px-1 py-0.5 text-[0.7rem]"
      />
      <Badge
        variant={PLANNING_STATUS_BADGE[stage.status]}
        className={stage.status === "ATRASADA" ? "animate-pulse-subtle w-fit" : "w-fit"}
      >
        {PLANNING_STATUS_LABELS[stage.status]}
      </Badge>
    </>
  );
}

function TaskRowView({
  row,
  workId,
  isDragging,
  predecessorOptions,
  rowRef,
  onGripPointerDown,
  calendar,
  isCritical,
}: {
  row: Extract<PlanningRow, { type: "task" }>;
  workId: string;
  isDragging: boolean;
  predecessorOptions: { value: string; label: string }[];
  rowRef: (el: HTMLDivElement | null) => void;
  onGripPointerDown: () => void;
  calendar: WorkCalendar;
  isCritical: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const task = row.task;
  const [start, setStart] = useState(toDateInputValue(task.dataInicioPrevista));
  const [end, setEnd] = useState(toDateInputValue(task.dataFimPrevista));
  const [durationDraft, setDurationDraft] = useState<string | null>(null);

  useEffect(() => {
    setStart(toDateInputValue(task.dataInicioPrevista));
    setEnd(toDateInputValue(task.dataFimPrevista));
  }, [task.dataInicioPrevista, task.dataFimPrevista]);

  function handleRename(nome: string) {
    startTransition(async () => {
      await updateTaskName(task.id, workId, nome);
      router.refresh();
    });
  }

  function commit(nextStart: string, nextEnd: string) {
    if (!nextStart || !nextEnd) return;
    startTransition(async () => {
      await updatePlanningTaskDates(task.id, workId, nextStart, nextEnd);
      router.refresh();
    });
  }

  function handleDurationChange(value: string) {
    setDurationDraft(value);
    const dias = Number(value);
    if (!start || !Number.isFinite(dias) || dias < 1) return;
    const nextEnd = toDateInputValue(addWorkingDays(new Date(start), dias - 1, calendar));
    setEnd(nextEnd);
    commit(start, nextEnd);
  }

  function handleDelete() {
    if (!confirm("Excluir esta atividade? Essa ação não pode ser desfeita.")) return;
    startTransition(async () => {
      await deleteTask(task.id, workId);
      toast.success("Atividade removida.");
      router.refresh();
    });
  }

  const duration = countWorkingDays(new Date(start), new Date(end), calendar);
  const varianceDays = task.baselineFim ? differenceInCalendarDays(task.dataFimPrevista, task.baselineFim) : null;

  return (
    <div
      ref={rowRef}
      className={`grid items-center border-b px-1 transition-colors hover:bg-warning/10 focus-within:bg-warning/15 ${row.stripe ? "bg-muted/10" : "bg-background"} ${isDragging ? "opacity-50" : ""} ${isCritical ? "bg-destructive/5 ring-1 ring-inset ring-destructive/30" : ""}`}
      style={{ gridTemplateColumns: GRID, height: ROW_HEIGHT }}
    >
      <GripCell onGripPointerDown={onGripPointerDown} />
      <span className="text-xs text-muted-foreground" style={{ paddingLeft: row.depth * 14 }}>
        {task.codigo}
      </span>
      <EditableName value={task.nome} onCommit={handleRename} />
      <input
        type="date"
        disabled={isPending}
        value={start}
        onChange={(e) => {
          setStart(e.target.value);
          commit(e.target.value, end);
        }}
        className="w-[98px] rounded border bg-background px-1 py-0.5 text-[0.7rem]"
      />
      <div className="relative">
        <input
          type="date"
          disabled={isPending}
          value={end}
          onChange={(e) => {
            setEnd(e.target.value);
            commit(start, e.target.value);
          }}
          className="w-[98px] rounded border bg-background px-1 py-0.5 text-[0.7rem]"
        />
        {varianceDays ? (
          <span
            className={`absolute -top-1.5 -right-1 rounded-full px-1 text-[0.55rem] font-semibold leading-tight ${
              varianceDays > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
            }`}
            title={`Linha de base: término em ${formatDateBR(task.baselineFim!)}`}
          >
            {varianceDays > 0 ? "+" : ""}
            {varianceDays}d
          </span>
        ) : null}
      </div>
      <input
        type="number"
        min={1}
        value={durationDraft ?? String(duration)}
        title="Dias úteis, conforme o calendário da obra"
        onFocus={() => setDurationDraft(String(duration))}
        onChange={(e) => handleDurationChange(e.target.value)}
        onBlur={() => setDurationDraft(null)}
        className="w-14 rounded border bg-background px-1 py-0.5 text-[0.7rem]"
      />
      <span className="text-xs text-muted-foreground">{Number(task.percentualExecutado).toFixed(0)}%</span>
      <Badge
        variant={PLANNING_STATUS_BADGE[task.status]}
        className={task.status === "ATRASADA" ? "animate-pulse-subtle w-fit" : "w-fit"}
      >
        {PLANNING_STATUS_LABELS[task.status]}
      </Badge>
      <PredecessorsCell
        workId={workId}
        ownerTaskId={task.id}
        ownCode={task.codigo}
        chips={task.predecessorChips}
        options={predecessorOptions}
      />
      <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isPending} title="Excluir">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
