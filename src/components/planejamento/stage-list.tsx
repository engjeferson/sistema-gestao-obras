"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, differenceInCalendarDays } from "date-fns";
import { GripVertical, MoreVertical, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditableName } from "@/components/planejamento/editable-name";
import { PredecessorsCell } from "@/components/planejamento/predecessors-cell";
import { PLANNING_STATUS_BADGE, PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";
import {
  createStage,
  createTask,
  deleteStage,
  deleteTask,
  reorderChildren,
  updatePlanningTaskDates,
  updateStageDates,
  updateStageName,
  updateTaskName,
  type PredecessorChip,
} from "@/server/actions/planejamento";

export type PlainTask = {
  id: string;
  codigo: string;
  nome: string;
  dataInicioPrevista: Date;
  dataFimPrevista: Date;
  percentualExecutado: number;
  status: string;
  predecessorChips: PredecessorChip[];
};

export type PlainStage = {
  id: string;
  codigo: string;
  nome: string;
  dataInicioPrevista: Date | null;
  dataFimPrevista: Date | null;
  predecessorChips: PredecessorChip[];
  tasks: PlainTask[];
  children: PlainStage[];
};

type CombinedEntry = { kind: "stage"; node: PlainStage } | { kind: "task"; node: PlainTask };

const INDENT = 20;

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

// O código é sempre "pai.N" (ex: "2.3") — o último segmento é a posição entre os irmãos, usado
// pra intercalar subs e itens na ordem certa sem precisar de um campo `ordem` no tipo do cliente.
function siblingIndex(codigo: string): number {
  const parts = codigo.split(".");
  return Number(parts[parts.length - 1]);
}

function collectAllTasks(stage: PlainStage): PlainTask[] {
  return [...stage.tasks, ...stage.children.flatMap(collectAllTasks)];
}

function hasAnyTask(stage: PlainStage): boolean {
  return stage.tasks.length > 0 || stage.children.some(hasAnyTask);
}

function combineEntries(stages: PlainStage[], tasks: PlainTask[]): CombinedEntry[] {
  return [
    ...stages.map((s): CombinedEntry => ({ kind: "stage", node: s })),
    ...tasks.map((t): CombinedEntry => ({ kind: "task", node: t })),
  ].sort((a, b) => siblingIndex(a.node.codigo) - siblingIndex(b.node.codigo));
}

// Índice pra cor alternada das linhas de sub (tudo que não é etapa de nível superior) — conta em
// pré-ordem, contínuo por baixo de qualquer etapa/sub, pra listras ficarem consistentes mesmo
// atravessando vários níveis de aninhamento.
function computeStripeIndex(
  stages: PlainStage[],
  tasks: PlainTask[],
  depth: number,
  counter: { value: number },
  map: Map<string, number>,
) {
  for (const entry of combineEntries(stages, tasks)) {
    if (depth > 0) {
      map.set(entry.node.id, counter.value);
      counter.value += 1;
    }
    if (entry.kind === "stage") {
      computeStripeIndex(entry.node.children, entry.node.tasks, depth + 1, counter, map);
    }
  }
}

export function StageList({ stages, workId }: { stages: PlainStage[]; workId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAddRootStage() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("workId", workId);
      fd.set("nome", "Nova etapa");
      const error = await createStage(undefined, fd);
      if (error) toast.error(error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleAddRootStage}>
          <Plus /> Etapa
        </Button>
      </div>

      {stages.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma etapa cadastrada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <th className="w-16 p-2">#</th>
                <th className="p-2">Atividade</th>
                <th className="p-2">Início</th>
                <th className="p-2">Fim</th>
                <th className="p-2">Duração (dias)</th>
                <th className="p-2">Progresso</th>
                <th className="p-2">Status</th>
                <th className="p-2">Predecessoras</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              <DraggableStageGroup
                stages={stages}
                tasks={[]}
                workId={workId}
                parentId={null}
                depth={0}
                stripeIndex={(() => {
                  const map = new Map<string, number>();
                  computeStripeIndex(stages, [], 0, { value: 0 }, map);
                  return map;
                })()}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Reordena (arrastar, Pointer Events) os filhos diretos de `parentId` — subs e itens juntos, na
// mesma lista, já que aparecem intercalados na Lista. Mesmo mecanismo já usado nas barras do
// Gantt, mais confiável em uso real do que o HTML5 Drag and Drop nativo.
function DraggableStageGroup({
  stages,
  tasks,
  workId,
  parentId,
  depth,
  stripeIndex,
}: {
  stages: PlainStage[];
  tasks: PlainTask[];
  workId: string;
  parentId: string | null;
  depth: number;
  stripeIndex: Map<string, number>;
}) {
  const router = useRouter();
  const entries: CombinedEntry[] = combineEntries(stages, tasks);
  const kindById = new Map(entries.map((e) => [e.node.id, e.kind]));

  const [order, setOrder] = useState(() => entries.map((e) => e.node.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const initialOrderRef = useRef(order);
  const draggingIdRef = useRef<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  useEffect(() => {
    setOrder(entries.map((e) => e.node.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages, tasks]);

  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      const draggedId = draggingIdRef.current;
      if (!draggedId) return;
      for (const [id, el] of rowRefs.current) {
        if (id === draggedId) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          setOrder((prev) => {
            if (!prev.includes(draggedId) || !prev.includes(id)) return prev;
            const next = prev.filter((x) => x !== draggedId);
            next.splice(next.indexOf(id), 0, draggedId);
            return next;
          });
          break;
        }
      }
    }
    function handlePointerUp() {
      const draggedId = draggingIdRef.current;
      draggingIdRef.current = null;
      setDraggingId(null);
      document.body.style.removeProperty("user-select");
      if (draggedId && JSON.stringify(initialOrderRef.current) !== JSON.stringify(orderRef.current)) {
        const orderedItems = orderRef.current.map((id) => ({ id, kind: kindById.get(id) ?? ("stage" as const) }));
        reorderChildren(workId, parentId, orderedItems).then(() => router.refresh());
      }
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId, parentId, router, stages, tasks]);

  function startDrag(id: string) {
    draggingIdRef.current = id;
    initialOrderRef.current = orderRef.current;
    setDraggingId(id);
    document.body.style.userSelect = "none";
  }

  const byId = new Map(entries.map((e) => [e.node.id, e]));
  const ordered = order.map((id) => byId.get(id)).filter((e): e is CombinedEntry => !!e);

  return (
    <>
      {ordered.map((entry) =>
        entry.kind === "stage" ? (
          <StageRows
            key={entry.node.id}
            stage={entry.node}
            workId={workId}
            depth={depth}
            isDragging={draggingId === entry.node.id}
            stripe={depth > 0 ? (stripeIndex.get(entry.node.id) ?? 0) % 2 === 1 : false}
            stripeIndex={stripeIndex}
            rowRef={(el) => {
              if (el) rowRefs.current.set(entry.node.id, el);
              else rowRefs.current.delete(entry.node.id);
            }}
            onGripPointerDown={() => startDrag(entry.node.id)}
          />
        ) : (
          <TaskRow
            key={entry.node.id}
            task={entry.node}
            workId={workId}
            depth={depth}
            isDragging={draggingId === entry.node.id}
            stripe={(stripeIndex.get(entry.node.id) ?? 0) % 2 === 1}
            rowRef={(el) => {
              if (el) rowRefs.current.set(entry.node.id, el);
              else rowRefs.current.delete(entry.node.id);
            }}
            onGripPointerDown={() => startDrag(entry.node.id)}
          />
        ),
      )}
    </>
  );
}

function GripCell({ codigo, onGripPointerDown }: { codigo: string; onGripPointerDown: () => void }) {
  return (
    <td
      onPointerDown={(e) => {
        e.preventDefault();
        onGripPointerDown();
      }}
      title="Arrastar para reordenar"
      className="touch-none cursor-grab p-2 text-center text-muted-foreground active:cursor-grabbing"
    >
      <span className="flex items-center justify-center gap-1">
        <GripVertical className="size-3.5" />
        {codigo}
      </span>
    </td>
  );
}

function StageRows({
  stage,
  workId,
  depth,
  isDragging,
  stripe,
  stripeIndex,
  rowRef,
  onGripPointerDown,
}: {
  stage: PlainStage;
  workId: string;
  depth: number;
  isDragging: boolean;
  stripe: boolean;
  stripeIndex: Map<string, number>;
  rowRef: (el: HTMLTableRowElement | null) => void;
  onGripPointerDown: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRename(nome: string) {
    startTransition(async () => {
      await updateStageName(stage.id, workId, nome);
      router.refresh();
    });
  }

  function handleAddTask() {
    startTransition(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const fd = new FormData();
      fd.set("workId", workId);
      fd.set("stageId", stage.id);
      fd.set("nome", "Nova atividade");
      fd.set("dataInicioPrevista", today);
      fd.set("dataFimPrevista", today);
      const error = await createTask(undefined, fd);
      if (error) toast.error(error);
      else router.refresh();
    });
  }

  function handleAddSubStage() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("workId", workId);
      fd.set("parentId", stage.id);
      fd.set("nome", "Nova sub-etapa");
      const error = await createStage(undefined, fd);
      if (error) toast.error(error);
      else router.refresh();
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
    <>
      <tr
        ref={rowRef}
        className={`border-b ${depth === 0 ? "bg-muted/40" : stripe ? "bg-muted/10" : "bg-background"} ${isDragging ? "opacity-50" : ""}`}
      >
        <GripCell codigo={stage.codigo} onGripPointerDown={onGripPointerDown} />
        <td className="p-2 font-semibold" style={{ paddingLeft: 8 + depth * INDENT }}>
          <EditableName value={stage.nome} bold onCommit={handleRename} />
        </td>
        <StageDateCells stage={stage} workId={workId} />
        <td className="p-2 text-muted-foreground">—</td>
        <td className="p-2 text-muted-foreground">—</td>
        <td className="p-2">
          <PredecessorsCell workId={workId} ownerStageId={stage.id} chips={stage.predecessorChips} />
        </td>
        <td className="p-2 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" disabled={isPending}>
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddTask}>+ Atividade</DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddSubStage}>+ Sub etapa</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
      {stage.children.length > 0 || stage.tasks.length > 0 ? (
        <DraggableStageGroup
          stages={stage.children}
          tasks={stage.tasks}
          workId={workId}
          parentId={stage.id}
          depth={depth + 1}
          stripeIndex={stripeIndex}
        />
      ) : null}
    </>
  );
}

// Enquanto a etapa/sub não tem nenhuma atividade (nela ou em qualquer sub dela), a data é
// "manual" e editável direto aqui (inclusive a duração, que recalcula o Fim). A partir da
// primeira atividade lançada em qualquer nível, a data exibida vira sempre o agregado (menor
// início / maior fim) — só leitura.
function StageDateCells({ stage, workId }: { stage: PlainStage; workId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [start, setStart] = useState(stage.dataInicioPrevista ? toDateInputValue(stage.dataInicioPrevista) : "");
  const [end, setEnd] = useState(stage.dataFimPrevista ? toDateInputValue(stage.dataFimPrevista) : "");

  useEffect(() => {
    setStart(stage.dataInicioPrevista ? toDateInputValue(stage.dataInicioPrevista) : "");
    setEnd(stage.dataFimPrevista ? toDateInputValue(stage.dataFimPrevista) : "");
  }, [stage.dataInicioPrevista, stage.dataFimPrevista]);

  if (hasAnyTask(stage)) {
    const tasks = collectAllTasks(stage);
    const aggStart = new Date(Math.min(...tasks.map((t) => t.dataInicioPrevista.getTime())));
    const aggEnd = new Date(Math.max(...tasks.map((t) => t.dataFimPrevista.getTime())));
    return (
      <>
        <td className="p-2 text-muted-foreground">{formatDateBR(aggStart)}</td>
        <td className="p-2 text-muted-foreground">{formatDateBR(aggEnd)}</td>
        <td className="p-2 text-muted-foreground">{differenceInCalendarDays(aggEnd, aggStart) + 1}</td>
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

  function handleDurationChange(value: string) {
    const dias = Number(value);
    if (!start || !Number.isFinite(dias) || dias < 1) return;
    const nextEnd = toDateInputValue(addDays(new Date(start), dias - 1));
    setEnd(nextEnd);
    commit(start, nextEnd);
  }

  const duration = start && end ? differenceInCalendarDays(new Date(end), new Date(start)) + 1 : "";

  return (
    <>
      <td className="p-2">
        <input
          type="date"
          value={start}
          disabled={isPending}
          onChange={(e) => {
            setStart(e.target.value);
            commit(e.target.value, end);
          }}
          className="rounded border bg-background px-1 py-0.5 text-xs"
        />
      </td>
      <td className="p-2">
        <input
          type="date"
          value={end}
          disabled={isPending}
          onChange={(e) => {
            setEnd(e.target.value);
            commit(start, e.target.value);
          }}
          className="rounded border bg-background px-1 py-0.5 text-xs"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          min={1}
          value={duration}
          disabled={isPending || !start}
          onChange={(e) => handleDurationChange(e.target.value)}
          className="w-16 rounded border bg-background px-1 py-0.5 text-xs"
        />
      </td>
    </>
  );
}

function TaskRow({
  task,
  workId,
  depth,
  isDragging,
  stripe,
  rowRef,
  onGripPointerDown,
}: {
  task: PlainTask;
  workId: string;
  depth: number;
  isDragging: boolean;
  stripe: boolean;
  rowRef: (el: HTMLTableRowElement | null) => void;
  onGripPointerDown: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [start, setStart] = useState(toDateInputValue(task.dataInicioPrevista));
  const [end, setEnd] = useState(toDateInputValue(task.dataFimPrevista));

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
    const dias = Number(value);
    if (!start || !Number.isFinite(dias) || dias < 1) return;
    const nextEnd = toDateInputValue(addDays(new Date(start), dias - 1));
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

  const duration = differenceInCalendarDays(new Date(end), new Date(start)) + 1;

  return (
    <tr ref={rowRef} className={`border-b ${stripe ? "bg-muted/10" : "bg-background"} ${isDragging ? "opacity-50" : ""}`}>
      <GripCell codigo={task.codigo} onGripPointerDown={onGripPointerDown} />
      <td className="p-2" style={{ paddingLeft: 8 + depth * INDENT }}>
        <EditableName value={task.nome} onCommit={handleRename} />
      </td>
      <td className="p-2">
        <input
          type="date"
          value={start}
          disabled={isPending}
          onChange={(e) => {
            setStart(e.target.value);
            commit(e.target.value, end);
          }}
          className="rounded border bg-background px-1 py-0.5 text-xs"
        />
      </td>
      <td className="p-2">
        <input
          type="date"
          value={end}
          disabled={isPending}
          onChange={(e) => {
            setEnd(e.target.value);
            commit(start, e.target.value);
          }}
          className="rounded border bg-background px-1 py-0.5 text-xs"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          min={1}
          value={duration}
          disabled={isPending}
          onChange={(e) => handleDurationChange(e.target.value)}
          className="w-16 rounded border bg-background px-1 py-0.5 text-xs"
        />
      </td>
      <td className="p-2">{Number(task.percentualExecutado).toFixed(0)}%</td>
      <td className="p-2">
        <Badge variant={PLANNING_STATUS_BADGE[task.status]}>{PLANNING_STATUS_LABELS[task.status]}</Badge>
      </td>
      <td className="p-2">
        <PredecessorsCell workId={workId} ownerTaskId={task.id} chips={task.predecessorChips} />
      </td>
      <td className="p-2 text-right">
        <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isPending} title="Excluir">
          <Trash2 className="size-4" />
        </Button>
      </td>
    </tr>
  );
}
