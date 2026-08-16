"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { AddTaskForm } from "@/components/planejamento/add-task-form";
import { DeleteStageButton, DeleteTaskButton } from "@/components/planejamento/delete-buttons";
import { EditableName } from "@/components/planejamento/editable-name";
import { PredecessorsCell } from "@/components/planejamento/predecessors-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLANNING_STATUS_BADGE, PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";
import {
  moveStage,
  reorderStages,
  updateStageDates,
  updateStageName,
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

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function collectAllTasks(stage: PlainStage): PlainTask[] {
  return [...stage.tasks, ...stage.children.flatMap(collectAllTasks)];
}

function hasAnyTask(stage: PlainStage): boolean {
  return stage.tasks.length > 0 || stage.children.some(hasAnyTask);
}

export function StageList({ stages, workId }: { stages: PlainStage[]; workId: string }) {
  if (stages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma etapa cadastrada ainda.
      </p>
    );
  }

  return <DraggableStageGroup stages={stages} workId={workId} parentId={null} depth={0} />;
}

// Grupo de etapas/subs irmãs sob o mesmo pai — permite arrastar (grip handle) pra reordenar,
// além dos botões de mover pra cima/baixo já existentes.
// Usa Pointer Events (não o HTML5 Drag and Drop nativo, que se mostrou pouco confiável em uso
// real) — mesmo padrão já usado pra arrastar as barras do Gantt.
function DraggableStageGroup({
  stages,
  workId,
  parentId,
  depth,
}: {
  stages: PlainStage[];
  workId: string;
  parentId: string | null;
  depth: number;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(() => stages.map((s) => s.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const initialOrderRef = useRef(order);
  const draggingIdRef = useRef<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    setOrder(stages.map((s) => s.id));
  }, [stages]);

  const byId = new Map(stages.map((s) => [s.id, s]));
  const ordered = order.map((id) => byId.get(id)).filter((s): s is PlainStage => !!s);

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
        reorderStages(workId, parentId, orderRef.current).then(() => router.refresh());
      }
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [workId, parentId, router]);

  function startDrag(id: string) {
    draggingIdRef.current = id;
    initialOrderRef.current = orderRef.current;
    setDraggingId(id);
    document.body.style.userSelect = "none";
  }

  return (
    <div className={depth === 0 ? "flex flex-col gap-6" : "flex flex-col gap-4 border-l pl-4"}>
      {ordered.map((stage, index) => (
        <div
          key={stage.id}
          ref={(el) => {
            if (el) rowRefs.current.set(stage.id, el);
            else rowRefs.current.delete(stage.id);
          }}
          className={draggingId === stage.id ? "opacity-50" : ""}
        >
          <StageCard
            stage={stage}
            workId={workId}
            depth={depth}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
            onGripPointerDown={() => startDrag(stage.id)}
          />
        </div>
      ))}
    </div>
  );
}

function StageCard({
  stage,
  workId,
  depth,
  isFirst,
  isLast,
  onGripPointerDown,
}: {
  stage: PlainStage;
  workId: string;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  onGripPointerDown: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRename(nome: string) {
    startTransition(async () => {
      await updateStageName(stage.id, workId, nome);
      toast.success("Renomeado.");
      router.refresh();
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveStage(stage.id, workId, direction);
      router.refresh();
    });
  }

  const moveButtons = (
    <div className="flex items-center gap-0.5">
      <span
        onPointerDown={(e) => {
          e.preventDefault();
          onGripPointerDown();
        }}
        title="Arrastar para reordenar"
        className="flex touch-none cursor-grab items-center px-1 text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={isPending || isFirst}
        onClick={() => handleMove("up")}
        title="Mover para cima"
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={isPending || isLast}
        onClick={() => handleMove("down")}
        title="Mover para baixo"
      >
        <ArrowDown className="size-4" />
      </Button>
    </div>
  );

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Predecessoras da etapa:</span>
        <PredecessorsCell workId={workId} ownerStageId={stage.id} chips={stage.predecessorChips} />
      </div>

      <StageDates stage={stage} workId={workId} />

      {stage.tasks.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Predecessoras</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stage.tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="text-muted-foreground">{task.codigo}</TableCell>
                  <TableCell className="font-medium">{task.nome}</TableCell>
                  <TableCell>{formatDateBR(task.dataInicioPrevista)}</TableCell>
                  <TableCell>{formatDateBR(task.dataFimPrevista)}</TableCell>
                  <TableCell>{Number(task.percentualExecutado).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Badge variant={PLANNING_STATUS_BADGE[task.status]}>{PLANNING_STATUS_LABELS[task.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <PredecessorsCell workId={workId} ownerTaskId={task.id} chips={task.predecessorChips} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteTaskButton taskId={task.id} workId={workId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma atividade aqui ainda.</p>
      )}

      <AddTaskForm workId={workId} stageId={stage.id} />

      {stage.children.length > 0 ? (
        <DraggableStageGroup stages={stage.children} workId={workId} parentId={stage.id} depth={depth + 1} />
      ) : null}
    </div>
  );

  if (depth === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-muted-foreground">{stage.codigo}</span>
            <EditableName value={stage.nome} bold onCommit={handleRename} />
          </CardTitle>
          <div className="flex items-center gap-1">
            {moveButtons}
            <DeleteStageButton stageId={stage.id} workId={workId} />
          </div>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-muted-foreground">{stage.codigo}</span>
          <EditableName value={stage.nome} bold onCommit={handleRename} />
        </div>
        <div className="flex items-center gap-1">
          {moveButtons}
          <DeleteStageButton stageId={stage.id} workId={workId} />
        </div>
      </div>
      {body}
    </div>
  );
}

// Enquanto a etapa/sub não tem nenhum item (nela ou em qualquer sub dela), a data é "manual" e
// editável direto aqui. A partir do primeiro item lançado em qualquer nível, a data exibida vira
// sempre o agregado (menor início / maior fim) dos itens — só leitura.
function StageDates({ stage, workId }: { stage: PlainStage; workId: string }) {
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
      <p className="text-sm text-muted-foreground">
        {formatDateBR(aggStart)} – {formatDateBR(aggEnd)}
      </p>
    );
  }

  function commit(nextStart: string, nextEnd: string) {
    if (!nextStart || !nextEnd) return;
    startTransition(async () => {
      await updateStageDates(stage.id, workId, nextStart, nextEnd);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Datas:</span>
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
      <span className="text-muted-foreground">até</span>
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
    </div>
  );
}
