import { listStockMovements } from "@/server/actions/estoque";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listWorks } from "@/server/actions/obras";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { getCurrentSensitiveValuesAccess } from "@/server/actions/permissions";
import { EstoqueTabsNav } from "@/components/estoque/estoque-tabs-nav";
import { StockMovementsFilters } from "@/components/estoque/stock-movements-filters";
import { StockMovementsTable } from "@/components/estoque/stock-movements-table";

export default async function EstoqueMovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    supplierId?: string;
    stageId?: string;
    dataInicio?: string;
    dataFim?: string;
  }>;
}) {
  const params = await searchParams;
  const filters = {
    tipo: params.tipo as "ENTRADA" | "SAIDA" | "TRANSFERENCIA" | undefined,
    supplierId: params.supplierId || undefined,
    stageId: params.stageId || undefined,
    dataInicio: params.dataInicio || undefined,
    dataFim: params.dataFim || undefined,
  };

  const [suppliers, works, stagesByWork, movements, canSeeValues] = await Promise.all([
    listSuppliers(),
    listWorks(),
    listStagesForAllWorks(),
    listStockMovements(filters),
    getCurrentSensitiveValuesAccess(),
  ]);
  const movementsOptions = movements.map((m) => ({
    ...m,
    quantidade: Number(m.quantidade),
    valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
  }));

  const workByCode = new Map(works.map((w) => [w.id, w.codigo]));
  const stageOptions = Object.entries(stagesByWork).flatMap(([workId, stages]) =>
    stages.map((stage) => ({
      id: stage.id,
      label: `${workByCode.get(workId) ?? "?"} — ${stage.codigo ? `${stage.codigo} ` : ""}${stage.nome}`,
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">Saldo e movimentações de materiais por local.</p>
      </div>

      <EstoqueTabsNav />

      <StockMovementsFilters suppliers={suppliers.map((s) => ({ id: s.id, nome: s.nome }))} stages={stageOptions} />

      <StockMovementsTable movements={movementsOptions} canSeeValues={canSeeValues} />
    </div>
  );
}
