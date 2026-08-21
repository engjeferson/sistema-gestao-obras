import Link from "next/link";
import {
  Building2,
  FileSignature,
  Calculator,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  TrendingUp,
  Receipt,
  ClipboardList,
} from "lucide-react";
import { getDashboardData, getCompanyOverview, getGlobalAlerts } from "@/server/actions/dashboard";
import { getCurrentFinancePermissions } from "@/server/actions/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { WorksOverviewTable } from "@/components/dashboard/works-overview-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrencyBRL, formatDateBR, TRANSACTION_TYPE_LABELS } from "@/lib/status-labels";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>;
}

export default async function DashboardPage() {
  const [data, company, alerts, perms] = await Promise.all([
    getDashboardData(),
    getCompanyOverview(),
    getGlobalAlerts(),
    getCurrentFinancePermissions(),
  ]);

  const obraKpis = [
    { icon: Building2, label: "Obras em andamento", value: data.obrasEmAndamento.toString() },
    { icon: FileSignature, label: "Valor total contratado", value: formatCurrencyBRL(company.valorTotalContratado) },
    { icon: TrendingUp, label: "Margem média projetada", value: `${company.margemMediaProjetada.toFixed(1)}%` },
  ];

  const saldoFinanceiroTone: "success" | "destructive" = data.saldoFinanceiro < 0 ? "destructive" : "success";

  const financeiroKpis: { icon: typeof Building2; label: string; value: string; tone?: "success" | "destructive" | "warning"; href?: string }[] = [
    { icon: Calculator, label: "Custo total orçado", value: formatCurrencyBRL(company.custoTotalOrcado) },
    { icon: Wallet, label: "Custo realizado", value: formatCurrencyBRL(company.custoRealizado) },
    ...(perms.verSaidas
      ? [
          {
            icon: ArrowDownCircle,
            label: "Contas a pagar",
            value: formatCurrencyBRL(data.totalAPagar),
            tone: "destructive" as const,
            href: "/financeiro?tipo=PAGAR&status=EM_ABERTO",
          },
        ]
      : []),
    ...(perms.verEntradas
      ? [
          {
            icon: ArrowUpCircle,
            label: "Contas a receber",
            value: formatCurrencyBRL(data.contasAReceber),
            tone: "success" as const,
            href: "/financeiro?tipo=RECEBER&status=EM_ABERTO",
          },
        ]
      : []),
    ...(perms.verSaudeFinanceira
      ? [
          {
            icon: PiggyBank,
            label: "Saldo financeiro",
            value: formatCurrencyBRL(data.saldoFinanceiro),
            tone: saldoFinanceiroTone,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral de todas as obras da empresa.</p>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Obras</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {obraKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Financeiro</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {financeiroKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <AlertsList alerts={alerts} />

      <div className="flex flex-col gap-3">
        <SectionTitle>Obras</SectionTitle>
        <WorksOverviewTable works={company.obrasRows} />
      </div>

      {data.gastoPorObra.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Valor gasto por obra</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {data.gastoPorObra.map((item) => (
              <Link
                key={item.work!.id}
                href={`/obras/${item.work!.id}`}
                className="flex items-center justify-between py-2 text-sm transition-colors first:pt-0 last:pb-0 hover:text-primary"
              >
                <span>
                  {item.work!.codigo} — {item.work!.nome}
                </span>
                <span className="font-medium">{formatCurrencyBRL(item.valor)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <SectionTitle>Atividade recente</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4 text-muted-foreground" /> Últimos lançamentos financeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {data.ultimosLancamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
              ) : (
                data.ultimosLancamentos.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.descricao}</p>
                      <p className="text-muted-foreground">
                        {t.workNome} · {TRANSACTION_TYPE_LABELS[t.tipo]}
                      </p>
                    </div>
                    <span className="shrink-0">{formatCurrencyBRL(t.valor)}</span>
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
              {data.ultimosRdos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum RDO lançado ainda.</p>
              ) : (
                data.ultimosRdos.map((r) => (
                  <Link
                    key={r.id}
                    href={`/obras/${r.workId}/rdo/${r.id}`}
                    className="flex items-center justify-between py-2 text-sm transition-colors first:pt-0 last:pb-0 hover:text-primary"
                  >
                    <span>
                      RDO #{r.numero} — {r.workNome}
                    </span>
                    <span className="text-muted-foreground">{formatDateBR(r.data)}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximas atividades do cronograma</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {data.proximasAtividades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade pendente.</p>
              ) : (
                data.proximasAtividades.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.nome}</p>
                      <p className="text-muted-foreground">{a.workNome}</p>
                    </div>
                    <span className="shrink-0 text-muted-foreground">{formatDateBR(a.dataInicioPrevista)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contas próximas do vencimento</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {data.contasProximasVencimento.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta a vencer nos próximos 7 dias.</p>
              ) : (
                data.contasProximasVencimento.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.descricao}</p>
                      <p className="text-muted-foreground">{c.workNome}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p>{formatCurrencyBRL(c.valor)}</p>
                      <p className="text-muted-foreground">{formatDateBR(c.dataVencimento)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
