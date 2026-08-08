import { notFound } from "next/navigation";
import { getWorkCostSummary, listBudgetByStage } from "@/server/actions/orcamento";
import { BudgetSummaryCards } from "@/components/orcamento/budget-summary-cards";
import { BudgetStageTree } from "@/components/orcamento/budget-stage-tree";
import { BudgetByStageTable } from "@/components/orcamento/budget-by-stage-table";

export default async function OrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [summary, stages] = await Promise.all([getWorkCostSummary(id), listBudgetByStage(id)]);

  if (!summary) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <BudgetSummaryCards
        contrato={summary.contrato}
        orcado={summary.orcado}
        lucroPrevisto={summary.lucroPrevisto}
        margemPrevista={summary.margemPrevista}
        custoPorM2={summary.custoPorM2}
      />
      <BudgetByStageTable stages={summary.stages} />
      <BudgetStageTree stages={stages} workId={id} />
    </div>
  );
}
