"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AddTaskForm } from "@/components/planejamento/add-task-form";
import { DeleteStageButton, DeleteTaskButton } from "@/components/planejamento/delete-buttons";
import { EditableName } from "@/components/planejamento/editable-name";
import { PredecessorsCell } from "@/components/planejamento/predecessors-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLANNING_STATUS_BADGE, PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";
import { moveStage, updateStageName, type PredecessorChip } from "@/server/actions/planejamento";

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
  predecessorChips: PredecessorChip[];
  tasks: PlainTask[];
  children: PlainStage[];
};

export function StageList({ stages, workId }: { stages: PlainStage[]; workId: string }) {
  if (stages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma etapa cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {stages.map((stage, index) => (
        <StageCard
          key={stage.id}
          stage={stage}
          workId={workId}
          depth={0}
          isFirst={index === 0}
          isLast={index === stages.length - 1}
        />
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
}: {
  stage: PlainStage;
  workId: string;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
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

      {stage.tasks.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Item</TableHead>
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
        <p className="text-sm text-muted-foreground">Nenhum item aqui ainda.</p>
      )}

      <AddTaskForm workId={workId} stageId={stage.id} />

      {stage.children.length > 0 ? (
        <div className="flex flex-col gap-4 border-l pl-4">
          {stage.children.map((child, index) => (
            <StageCard
              key={child.id}
              stage={child}
              workId={workId}
              depth={depth + 1}
              isFirst={index === 0}
              isLast={index === stage.children.length - 1}
            />
          ))}
        </div>
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
