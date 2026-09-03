import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { getStockBalances } from "@/server/actions/estoque";
import { listWorks } from "@/server/actions/obras";
import { getCurrentSensitiveValuesAccess } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StockLocationFilter } from "@/components/estoque/stock-location-filter";
import { StockBalanceSearch } from "@/components/estoque/stock-balance-search";
import { EstoqueTabsNav } from "@/components/estoque/estoque-tabs-nav";
import { formatCurrencyOrHidden } from "@/lib/status-labels";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const { local } = await searchParams;
  const workId = local || undefined;

  const [works, balances, canSeeValues] = await Promise.all([
    listWorks(),
    getStockBalances(workId),
    getCurrentSensitiveValuesAccess(),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const valorTotalEstoque = balances.reduce((sum, b) => sum + b.valorTotal, 0);

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

      <EstoqueTabsNav />

      <StockLocationFilter works={worksOptions} selected={workId ?? ""} />

      <div className="max-w-sm">
        <KpiCard
          icon={Wallet}
          label="Valor total em estoque neste local"
          value={formatCurrencyOrHidden(valorTotalEstoque, canSeeValues)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Saldo atual</h2>
        <StockBalanceSearch balances={balances} />
      </div>
    </div>
  );
}
