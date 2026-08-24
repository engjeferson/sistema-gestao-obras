import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import {
  listWorksForFilter,
  getReportOrcamentoObra,
  getReportPrevistoRealizado,
  getReportCustosPorEtapa,
  getReportFisicoFinanceiro,
  getReportDespesasPorObra,
  getReportDespesasPorFornecedor,
  getReportDespesasPorCategoria,
  getReportNotasFiscaisPorObra,
  getReportContasAPagarPorObra,
} from "@/server/actions/relatorios";
import { REPORT_DEFINITIONS, type ReportTable } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const REPORT_FETCHERS: Record<string, (workId?: string) => Promise<ReportTable>> = {
  "orcamento-obra": getReportOrcamentoObra,
  "previsto-realizado": getReportPrevistoRealizado,
  "custos-por-etapa": getReportCustosPorEtapa,
  "fisico-financeiro": getReportFisicoFinanceiro,
  "despesas-por-obra": () => getReportDespesasPorObra(),
  "despesas-por-fornecedor": () => getReportDespesasPorFornecedor(),
  "despesas-por-categoria": () => getReportDespesasPorCategoria(),
  "notas-fiscais-por-obra": getReportNotasFiscaisPorObra,
  "contas-a-pagar-por-obra": getReportContasAPagarPorObra,
};

export default async function RelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ tipo: string }>;
  searchParams: Promise<{ workId?: string }>;
}) {
  const { tipo } = await params;
  const { workId } = await searchParams;

  const definition = REPORT_DEFINITIONS.find((r) => r.slug === tipo);
  const fetcher = REPORT_FETCHERS[tipo];
  if (!definition || !fetcher) {
    notFound();
  }

  const works = definition.scopedToWork ? await listWorksForFilter() : [];
  const effectiveWorkId = workId || (definition.scopedToWork && !definition.allowAll ? works[0]?.id : undefined);
  const report = await fetcher(effectiveWorkId);

  const exportHref = (format: "pdf" | "xlsx") =>
    `/api/relatorios/${tipo}?format=${format}${effectiveWorkId ? `&workId=${effectiveWorkId}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{report.title}</h1>
          {report.subtitle ? <p className="text-muted-foreground">{report.subtitle}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<a href={exportHref("pdf")} />} nativeButton={false}>
            <Download /> PDF
          </Button>
          <Button variant="outline" size="sm" render={<a href={exportHref("xlsx")} />} nativeButton={false}>
            <Download /> Excel
          </Button>
        </div>
      </div>

      {definition.scopedToWork ? (
        <form className="flex max-w-sm items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <NativeSelect name="workId" defaultValue={effectiveWorkId ?? ""}>
              {definition.allowAll ? <option value="">Todas as obras</option> : null}
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.codigo} — {work.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline" size="sm">
            Filtrar
          </Button>
        </form>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          {report.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dado encontrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {report.columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row, index) => (
                    <TableRow key={index}>
                      {report.columns.map((column) => (
                        <TableCell key={column.key}>{row[column.key]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                {report.total ? (
                  <TableFooter>
                    <TableRow>
                      {report.columns.map((column) => (
                        <TableCell key={column.key} className="font-semibold">
                          {report.total?.[column.key] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
