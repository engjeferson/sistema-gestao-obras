"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddStageForm } from "@/components/planejamento/add-stage-form";
import { AddTaskForm } from "@/components/planejamento/add-task-form";
import { DeleteStageButton, DeleteTaskButton } from "@/components/planejamento/delete-buttons";
import { EditableName } from "@/components/planejamento/editable-name";
import { TaskPredecessorsCell, type PredecessorLink } from "@/components/planejamento/task-predecessors-cell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLANNING_STATUS_BADGE, PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";
import { updateStageName } from "@/server/actions/planejamento";

export type TaskOption = { id: string; codigo: string | null; nome: string; stageNome: string };

export type PlainTask = {
  id: string;
  codigo: string | null;
  nome: string;
  dataInicioPrevista: Date;
  dataFimPrevista: Date;
  percentualExecutado: number;
  status: string;
  predecessors: PredecessorLink[];
};

export type PlainStage = {
  id: string;
  codigo: string | null;
  nome: string;
  tasks: PlainTask[];
  children: PlainStage[];
};

export function StageList({
  stages,
  workId,
  allTasks,
}: {
  stages: PlainStage[];
  workId: string;
  allTasks: TaskOption[];
}) {
  if (stages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma etapa cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {stages.map((stage) => (
        <StageCard key={stage.id} stage={stage} workId={workId} allTasks={allTasks} depth={0} />
      ))}
    </div>
  );
}

function StageCard({
  stage,
  workId,
  allTasks,
  depth,
}: {
  stage: PlainStage;
  workId: string;
  allTasks: TaskOption[];
  depth: number;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleRename(nome: string) {
    startTransition(async () => {
      await updateStageName(stage.id, workId, nome);
      toast.success("Renomeado.");
      router.refresh();
    });
  }

  const body = (
    <div className="flex flex-col gap-4">
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
                    <TaskPredecessorsCell
                      taskId={task.id}
                      workId={workId}
                      predecessors={task.predecessors}
                      allTasks={allTasks}
                    />
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

      <div className="flex flex-wrap gap-2">
        <AddTaskForm workId={workId} stageId={stage.id} />
        <AddStageForm workId={workId} parentId={stage.id} label="Nova sub" compact />
      </div>

      {stage.children.length > 0 ? (
        <div className="flex flex-col gap-4 border-l pl-4">
          {stage.children.map((child) => (
            <StageCard key={child.id} stage={child} workId={workId} allTasks={allTasks} depth={depth + 1} />
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
            {stage.codigo ? <span className="text-muted-foreground">{stage.codigo}</span> : null}
            <EditableName value={stage.nome} bold onCommit={handleRename} />
          </CardTitle>
          <DeleteStageButton stageId={stage.id} workId={workId} />
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          {stage.codigo ? <span className="text-muted-foreground">{stage.codigo}</span> : null}
          <EditableName value={stage.nome} bold onCommit={handleRename} />
        </div>
        <DeleteStageButton stageId={stage.id} workId={workId} />
      </div>
      {body}
    </div>
  );
}
