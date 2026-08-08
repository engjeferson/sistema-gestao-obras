import { FileSignature, Calculator, TrendingUp, Percent, Ruler } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrencyBRL } from "@/lib/status-labels";

export function BudgetSummaryCards({
  contrato,
  orcado,
  lucroPrevisto,
  margemPrevista,
  custoPorM2,
}: {
  contrato: number;
  orcado: number;
  lucroPrevisto: number;
  margemPrevista: number;
  custoPorM2: number | null;
}) {
  const cards = [
    { icon: FileSignature, label: "Valor do contrato", value: formatCurrencyBRL(contrato) },
    { icon: Calculator, label: "Custo orçado", value: formatCurrencyBRL(orcado) },
    { icon: TrendingUp, label: "Lucro previsto", value: formatCurrencyBRL(lucroPrevisto) },
    { icon: Percent, label: "Margem prevista", value: `${margemPrevista.toFixed(1)}%` },
    ...(custoPorM2 !== null ? [{ icon: Ruler, label: "Custo previsto/m²", value: formatCurrencyBRL(custoPorM2) }] : []),
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
