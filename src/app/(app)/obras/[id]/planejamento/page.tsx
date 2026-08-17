import Link from "next/link";
import { Import } from "lucide-react";
import { listStagesWithTasks, type StageTreeNode } from "@/server/actions/planejamento";
import { listPlanningTemplates } from "@/server/actions/planejamento-templates";
import { PlanningView } from "@/components/planejamento/planning-view";
import { ApplyTemplatePicker } from "@/components/planejamento/apply-template-picker";
import { SaveAsTemplateButton } from "@/components/planejamento/save-as-template-dialog";
import { Button } from "@/components/ui/button";
import type { PlainStage } from "@/components/planejamento/stage-list";

// O código (ID) sempre é calculado por posição em listStagesWithTasks — nunca fica null na prática.
function mapStage(stage: StageTreeNode): PlainStage {
  return {
    id: stage.id,
    codigo: stage.codigo!,
    nome: stage.nome,
    dataInicioPrevista: stage.dataInicioPrevista,
    dataFimPrevista: stage.dataFimPrevista,
    predecessorChips: stage.predecessorChips,
    tasks: stage.tasks.map((task) => ({
      id: task.id,
      codigo: task.codigo!,
      nome: task.nome,
      dataInicioPrevista: task.dataInicioPrevista,
      dataFimPrevista: task.dataFimPrevista,
      percentualExecutado: Number(task.percentualExecutado),
      status: task.status,
      predecessorChips: task.predecessorChips,
    })),
    children: stage.children.map(mapStage),
  };
}

export default async function PlanejamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stagesRaw = await listStagesWithTasks(id);
  const stages = stagesRaw.map(mapStage);

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
      <div className="flex flex-wrap items-center justify-end gap-2">
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
      <PlanningView stages={stages} workId={id} />
    </div>
  );
}
