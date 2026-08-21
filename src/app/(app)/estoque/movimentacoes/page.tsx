import { listStockMovements } from "@/server/actions/estoque";
import { listSuppliers } from "@/server/actions/fornecedores";
import { EstoqueTabsNav } from "@/components/estoque/estoque-tabs-nav";
import { StockMovementsFilters } from "@/components/estoque/stock-movements-filters";
import { StockMovementsTable } from "@/components/estoque/stock-movements-table";

export default async function EstoqueMovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    supplierId?: string;
    dataInicio?: string;
    dataFim?: string;
  }>;
}) {
  const params = await searchParams;
  const filters = {
    tipo: params.tipo as "ENTRADA" | "SAIDA" | "TRANSFERENCIA" | undefined,
    supplierId: params.supplierId || undefined,
    dataInicio: params.dataInicio || undefined,
    dataFim: params.dataFim || undefined,
  };

  const [suppliers, movements] = await Promise.all([listSuppliers(), listStockMovements(filters)]);
  const movementsOptions = movements.map((m) => ({
    ...m,
    quantidade: Number(m.quantidade),
    valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">Saldo e movimentações de materiais por local.</p>
      </div>

      <EstoqueTabsNav />

      <StockMovementsFilters suppliers={suppliers.map((s) => ({ id: s.id, nome: s.nome }))} />

      <StockMovementsTable movements={movementsOptions} />
    </div>
  );
}
