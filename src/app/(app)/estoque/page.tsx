import Link from "next/link";
import { Plus } from "lucide-react";
import { getStockBalances, listStockMovements } from "@/server/actions/estoque";
import { listWorks } from "@/server/actions/obras";
import { Button } from "@/components/ui/button";
import { StockLocationFilter } from "@/components/estoque/stock-location-filter";
import { StockBalanceTable } from "@/components/estoque/stock-balance-table";
import { StockMovementsTable } from "@/components/estoque/stock-movements-table";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const { local } = await searchParams;
  const workId = local || undefined;

  const [works, balances, movements] = await Promise.all([
    listWorks(),
    getStockBalances(workId),
    listStockMovements({ workId: workId ?? null }),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const movementsOptions = movements.map((m) => ({
    ...m,
    quantidade: Number(m.quantidade),
    valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground">Saldo e movimentações de materiais por local.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" render={<Link href="/estoque/nova-saida" />} nativeButton={false}>
            <Plus /> Saída
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/estoque/nova-transferencia" />}
            nativeButton={false}
          >
            <Plus /> Transferência
          </Button>
          <Button size="sm" render={<Link href="/estoque/nova-entrada" />} nativeButton={false}>
            <Plus /> Entrada
          </Button>
        </div>
      </div>

      <StockLocationFilter works={worksOptions} selected={workId ?? ""} />

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Saldo atual</h2>
        <StockBalanceTable balances={balances} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Últimas movimentações</h2>
        <StockMovementsTable movements={movementsOptions} />
      </div>
    </div>
  );
}
