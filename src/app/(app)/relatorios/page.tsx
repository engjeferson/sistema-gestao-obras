import Link from "next/link";
import { REPORT_DEFINITIONS } from "@/lib/reports";
import { getCurrentReportPermissions } from "@/server/actions/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RelatoriosPage() {
  const permissions = await getCurrentReportPermissions();
  const reports = REPORT_DEFINITIONS.filter((report) =>
    report.categoria === "financeiro" ? permissions.verRelatoriosFinanceiros : permissions.verRelatoriosOperacionais,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Tabelas prontas para consulta e exportação em PDF ou Excel.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.slug} href={`/relatorios/${report.slug}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="text-base">{report.label}</CardTitle>
                <CardDescription>{report.scopedToWork ? "Por obra" : "Todas as obras"}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {permissions.verRelatoriosOperacionais ? (
          <Link href="/relatorios/historico-custos">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="text-base">Histórico de custos</CardTitle>
                <CardDescription>Comparar preços de materiais entre compras</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Cada relatório pode ser exportado em PDF ou Excel diretamente na tela do relatório.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
