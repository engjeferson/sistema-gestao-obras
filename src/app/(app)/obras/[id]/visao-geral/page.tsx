import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileSignature,
  TrendingUp,
  Percent,
  Calculator,
  Wallet,
  ArrowDownCircle,
  Layers,
  PiggyBank,
  HardHat,
  Gauge,
  CalendarDays,
  ClipboardList,
  Receipt,
} from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { getWorkOverview } from "@/server/actions/obras";
import { getWorkCostSummary, getWorkAlerts } from "@/server/actions/orcamento";
import { listOverdueTasks, listUpcomingTasks } from "@/server/actions/planejamento";
import { listUpcomingBills } from "@/server/actions/financeiro";
import { listInvoices } from "@/server/actions/notas-fiscais";
import { getCurrentFinancePermissions } from "@/server/actions/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BudgetByStageTable } from "@/components/orcamento/budget-by-stage-table";
import { PortalShareCard } from "@/components/obras/portal-share-card";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>;
}

export default async function VisaoGeralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [overview, summary, alerts, atrasadas, proximasAtividades, contasAVencer, notasFiscais, perms] =
    await Promise.all([
      getWorkOverview(id),
      getWorkCostSummary(id),
      getWorkAlerts(id),
      listOverdueTasks(id),
      listUpcomingTasks(id),
      listUpcomingBills(id),
      listInvoices(id, 1),
      getCurrentFinancePermissions(),
    ]);
  if (!overview || !summary) {
    notFound();
  }

  const { work, diasDeObra, ultimosRdos } = overview;

  const margemTone = summary.indicadorMargem === "MELHOROU" ? "success" : summary.indicadorMargem === "PIOROU" ? "destructive" : "default";
  const margemLabel = summary.indicadorMargem === "MELHOROU" ? "melhorou" : summary.indicadorMargem === "PIOROU" ? "piorou" : "estável";

  const contratoKpis = [
    { icon: FileSignature, label: "Valor do contrato", value: formatCurrencyBRL(summary.contrato) },
    { icon: TrendingUp, label: "Lucro previsto", value: formatCurrencyBRL(summary.lucroPrevisto) },
    { icon: Percent, label: "Margem prevista", value: `${summary.margemPrevista.toFixed(1)}%` },
    {
      icon: TrendingUp,
      label: "Margem projetada",
      value: `${summary.margemProjetada.toFixed(1)}% (${margemLabel})`,
      tone: margemTone as "default" | "success" | "destructive",
    },
  ];

  const custoKpis: { icon: typeof Calculator; label: string; value: string; tone?: "destructive" | "success" }[] = [
    { icon: Calculator, label: "Custo orçado", value: formatCurrencyBRL(summary.orcado) },
    { icon: Wallet, label: "Custo realizado", value: formatCurrencyBRL(summary.realizado) },
    ...(perms.verSaidas
      ? [{ icon: ArrowDownCircle, label: "Contas a pagar", value: formatCurrencyBRL(summary.aPagar), tone: "destructive" as const }]
      : []),
    { icon: Layers, label: "Custo comprometido", value: formatCurrencyBRL(summary.comprometido) },
    ...(perms.verSaldo
      ? [
          {
            icon: PiggyBank,
            label: "Saldo do orçamento",
            value: formatCurrencyBRL(summary.saldoOrcamento),
            tone: (summary.saldoOrcamento < 0 ? "destructive" : "success") as "destructive" | "success",
          },
        ]
      : []),
  ];

  const avancoKpis = [
    { icon: HardHat, label: "Avanço físico", value: `${summary.avancoFisico.toFixed(0)}%` },
    { icon: Gauge, label: "Avanço financeiro", value: `${summary.avancoFinanceiro.toFixed(0)}%` },
    { icon: CalendarDays, label: "Dias de obra", value: `${diasDeObra} dias` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PortalShareCard workId={work.id} portalToken={work.portalToken} />

      <div className="flex flex-col gap-3">
        <SectionTitle>Contrato & margem</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contratoKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Custos</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {custoKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Avanço</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {avancoKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <AlertsList alerts={alerts} />

      <BudgetByStageTable stages={summary.stages} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividades atrasadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {atrasadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade atrasada.</p>
            ) : (
              atrasadas.map((task) => {
                const hoje = new Date();
                hoje.setUTCHours(0, 0, 0, 0);
                const diasAtraso = differenceInCalendarDays(hoje, task.dataFimPrevista);
                return (
                  <div key={task.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{task.nome}</p>
                      <p className="text-muted-foreground">{task.stage.nome}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-destructive">{formatDateBR(task.dataFimPrevista)}</p>
                      {diasAtraso > 0 ? (
                        <p className="text-xs text-destructive/80">
                          {diasAtraso} dia{diasAtraso === 1 ? "" : "s"} de atraso
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas atividades</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {proximasAtividades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade pendente.</p>
            ) : (
              proximasAtividades.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{task.nome}</p>
                    <p className="text-muted-foreground">{task.stage.nome}</p>
                  </div>
                  <span className="shrink-0 text-muted-foreground">{formatDateBR(task.dataInicioPrevista)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" /> Últimos RDOs
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {ultimosRdos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum RDO lançado ainda.</p>
            ) : (
              ultimosRdos.map((rdo) => (
                <Link
                  key={rdo.id}
                  href={`/obras/${work.id}/rdo/${rdo.id}`}
                  className="flex items-center justify-between py-2 text-sm transition-colors first:pt-0 last:pb-0 hover:text-primary"
                >
                  <span>
                    RDO #{rdo.numero} — {formatDateBR(rdo.data)}
                  </span>
                  <span className="text-muted-foreground">{rdo.responsavel.name}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {perms.verSaidas ? (
          <Card>
            <CardHeader>
              <CardTitle>Contas a vencer (7 dias)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {contasAVencer.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta a vencer nos próximos 7 dias.</p>
              ) : (
                contasAVencer.map((conta) => (
                  <div key={conta.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <p className="min-w-0 truncate font-medium">{conta.descricao}</p>
                    <div className="shrink-0 text-right">
                      <p>{formatCurrencyBRL(Number(conta.valor))}</p>
                      <p className="text-muted-foreground">{formatDateBR(conta.dataVencimento)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" /> Últimas notas fiscais
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {notasFiscais.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma nota fiscal lançada ainda.</p>
            ) : (
              notasFiscais.items.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {invoice.nome ? invoice.nome : invoice.numero ? `NF ${invoice.numero}` : "Nota fiscal"}
                    </p>
                    <p className="text-muted-foreground">{invoice.supplier.nome}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p>{formatCurrencyBRL(Number(invoice.valorTotal))}</p>
                    <p className="text-muted-foreground">{formatDateBR(invoice.dataEmissao)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {work.observacoes ? (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{work.observacoes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
