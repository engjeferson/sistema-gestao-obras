import Link from "next/link";
import { Plus, Wallet, Package } from "lucide-react";
import { getStockBalances } from "@/server/actions/estoque";
import { listWorks } from "@/server/actions/obras";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StockLocationFilter } from "@/components/estoque/stock-location-filter";
import { StockBalanceSearch } from "@/components/estoque/stock-balance-search";
import { EstoqueTabsNav } from "@/components/estoque/estoque-tabs-nav";
import { formatCurrencyBRL } from "@/lib/status-labels";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const { local } = await searchParams;
  const workId = local || undefined;

  const [works, balances] = await Promise.all([listWorks(), getStockBalances(workId)]);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard icon={Wallet} label="Valor total em estoque neste local" value={formatCurrencyBRL(valorTotalEstoque)} />
        <KpiCard icon={Package} label="Materiais com saldo neste local" value={String(balances.length)} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Saldo atual</h2>
        <StockBalanceSearch balances={balances} />
      </div>
    </div>
  );
}
