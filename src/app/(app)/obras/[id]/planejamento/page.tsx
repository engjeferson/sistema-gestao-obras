import Link from "next/link";
import { Import } from "lucide-react";
import { listStagesWithTasks, listTasksForDependencyPicker } from "@/server/actions/planejamento";
import { AddStageForm } from "@/components/planejamento/add-stage-form";
import { PlanningView } from "@/components/planejamento/planning-view";
import { Button } from "@/components/ui/button";

export default async function PlanejamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [stagesRaw, allTasksRaw] = await Promise.all([listStagesWithTasks(id), listTasksForDependencyPicker(id)]);

  const stages = stagesRaw.map((stage) => ({
    id: stage.id,
    codigo: stage.codigo,
    nome: stage.nome,
    tasks: stage.tasks.map((task) => ({
      id: task.id,
      codigo: task.codigo,
      nome: task.nome,
      dataInicioPrevista: task.dataInicioPrevista,
      dataFimPrevista: task.dataFimPrevista,
      percentualExecutado: Number(task.percentualExecutado),
      status: task.status,
      predecessors: task.predecessors.map((dep) => ({
        dependencyId: dep.id,
        taskId: dep.predecessorTask.id,
        codigo: dep.predecessorTask.codigo,
        nome: dep.predecessorTask.nome,
      })),
    })),
  }));

  const allTasks = allTasksRaw.map((task) => ({
    id: task.id,
    codigo: task.codigo,
    nome: task.nome,
    stageNome: task.stage.nome,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <AddStageForm workId={id} />
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/obras/${id}/planejamento/importar`} />}
          nativeButton={false}
        >
          <Import /> Lançamento em bloco
        </Button>
      </div>
      <PlanningView stages={stages} workId={id} allTasks={allTasks} />
    </div>
  );
}
