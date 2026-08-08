import { AddTaskForm } from "@/components/planejamento/add-task-form";
import { DeleteStageButton, DeleteTaskButton } from "@/components/planejamento/delete-buttons";
import { TaskPredecessorsCell, type PredecessorLink } from "@/components/planejamento/task-predecessors-cell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLANNING_STATUS_BADGE, PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";

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
        <Card key={stage.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {stage.codigo ? <span className="text-muted-foreground">{stage.codigo} — </span> : null}
              {stage.nome}
            </CardTitle>
            <DeleteStageButton stageId={stage.id} workId={workId} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
                          <Badge variant={PLANNING_STATUS_BADGE[task.status]}>
                            {PLANNING_STATUS_LABELS[task.status]}
                          </Badge>
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
              <p className="text-sm text-muted-foreground">Nenhuma atividade nesta etapa ainda.</p>
            )}
            <AddTaskForm workId={workId} stageId={stage.id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
