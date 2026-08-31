import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet, Package } from "lucide-react";
import { getMaterialStockDetail } from "@/server/actions/estoque";
import { getCurrentSensitiveValuesAccess } from "@/server/actions/permissions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StockMovementsTable } from "@/components/estoque/stock-movements-table";
import { UNIT_LABELS, formatCurrencyOrHidden } from "@/lib/status-labels";

export default async function MaterialStockDetailPage({
  params,
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = await params;
  const [detail, canSeeValues] = await Promise.all([
    getMaterialStockDetail(materialId),
    getCurrentSensitiveValuesAccess(),
  ]);
  if (!detail) {
    notFound();
  }
  const { material, movements, saldosPorLocal } = detail;

  const movementsOptions = movements.map((m) => ({
    ...m,
    quantidade: Number(m.quantidade),
    valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
  }));
  const saldoTotal = saldosPorLocal.reduce((sum, s) => sum + s.quantidade, 0);
  const valorTotalGeral = saldosPorLocal.reduce((sum, s) => sum + s.valorTotal, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/estoque"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar para o estoque
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{material.nome}</h1>
        <p className="text-muted-foreground">
          {material.unidadePadrao ? UNIT_LABELS[material.unidadePadrao] : "—"} · Histórico completo de movimentações
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard icon={Package} label="Saldo total (todos os locais)" value={String(saldoTotal)} />
        <KpiCard icon={Wallet} label="Valor total em estoque" value={formatCurrencyOrHidden(valorTotalGeral, canSeeValues)} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Saldo por local</h2>
        {saldosPorLocal.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Nenhum saldo deste material em nenhum local.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saldosPorLocal.map((s) => (
              <div key={s.workId ?? "geral"} className="flex flex-col gap-1 rounded-lg border p-4">
                <span className="text-sm font-medium">{s.workLabel}</span>
                <span className={`text-lg font-semibold ${s.quantidade < 0 ? "text-destructive" : ""}`}>
                  {s.quantidade}
                </span>
                <span className="text-sm text-muted-foreground">{formatCurrencyOrHidden(s.valorTotal, canSeeValues)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Log de movimentações</h2>
        <StockMovementsTable movements={movementsOptions} showMaterialColumn={false} canSeeValues={canSeeValues} />
      </div>
    </div>
  );
}
