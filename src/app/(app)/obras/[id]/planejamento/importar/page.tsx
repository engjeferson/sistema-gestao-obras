import { BulkPlanningEditor } from "@/components/planejamento/bulk-planning-editor";
import { listStagesWithTasks, type StageTreeNode } from "@/server/actions/planejamento";
import type { PlainStage } from "@/components/planejamento/stage-list";

// Só precisamos de id/codigo/nome/children pra montar o seletor de pai — sem tasks/chips.
function mapStage(stage: StageTreeNode): PlainStage {
  return {
    id: stage.id,
    codigo: stage.codigo!,
    nome: stage.nome,
    dataInicioPrevista: null,
    dataFimPrevista: null,
    predecessorChips: [],
    tasks: [],
    children: stage.children.map(mapStage),
  };
}

export default async function ImportarPlanejamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stagesRaw = await listStagesWithTasks(id);
  const stages = stagesRaw.map(mapStage);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lançamento em bloco</h1>
        <p className="text-muted-foreground">
          Monte o plano completo — etapas, atividades, datas e predecessoras — e salve tudo de uma vez.
        </p>
      </div>
      <BulkPlanningEditor workId={id} stages={stages} />
    </div>
  );
}
