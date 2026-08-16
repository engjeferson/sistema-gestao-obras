import Link from "next/link";
import { Import } from "lucide-react";
import { listStagesWithTasks, listTasksForDependencyPicker, type StageTreeNode } from "@/server/actions/planejamento";
import { listPlanningTemplates } from "@/server/actions/planejamento-templates";
import { AddStageForm } from "@/components/planejamento/add-stage-form";
import { PlanningView } from "@/components/planejamento/planning-view";
import { ApplyTemplatePicker } from "@/components/planejamento/apply-template-picker";
import { SaveAsTemplateButton } from "@/components/planejamento/save-as-template-dialog";
import { Button } from "@/components/ui/button";
import type { PlainStage } from "@/components/planejamento/stage-list";

function mapStage(stage: StageTreeNode): PlainStage {
  return {
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
    children: stage.children.map(mapStage),
  };
}

export default async function PlanejamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [stagesRaw, allTasksRaw] = await Promise.all([listStagesWithTasks(id), listTasksForDependencyPicker(id)]);

  const stages = stagesRaw.map(mapStage);

  const allTasks = allTasksRaw.map((task) => ({
    id: task.id,
    codigo: task.codigo,
    nome: task.nome,
    stageNome: task.stage.nome,
  }));

  if (stages.length === 0) {
    const templates = await listPlanningTemplates();
    return (
      <div className="flex flex-col gap-6">
        <ApplyTemplatePicker workId={id} templates={templates} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <AddStageForm workId={id} />
        <div className="flex items-center gap-2">
          <SaveAsTemplateButton workId={id} />
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/obras/${id}/planejamento/importar`} />}
            nativeButton={false}
          >
            <Import /> Lançamento em bloco
          </Button>
        </div>
      </div>
      <PlanningView stages={stages} workId={id} allTasks={allTasks} />
    </div>
  );
}
