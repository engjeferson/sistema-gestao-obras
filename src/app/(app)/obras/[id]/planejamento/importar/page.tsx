import { BulkPlanningEditor } from "@/components/planejamento/bulk-planning-editor";
import { listStagesWithTasks, type StageTreeNode } from "@/server/actions/planejamento";
import type { PlainStage } from "@/components/planejamento/stage-list";

// Traz a árvore completa (não só id/nome) — além de alimentar o seletor de pai, agora também
// mostra pro usuário o que já está lançado nesta obra (pra não parecer que a tela zerou tudo).
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
      baselineInicio: task.baselineInicio,
      baselineFim: task.baselineFim,
      percentualExecutado: Number(task.percentualExecutado),
      status: task.status,
      predecessorChips: task.predecessorChips,
    })),
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
