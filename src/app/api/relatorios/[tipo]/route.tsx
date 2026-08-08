import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getObjectBase64 } from "@/lib/r2";
import { buildXlsxBuffer } from "@/lib/export-xlsx";
import { ReportPdfDocument } from "@/server/services/pdf/report-pdf";
import {
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
import type { ReportTable } from "@/lib/reports";

export const runtime = "nodejs";

const REPORTS: Record<string, (workId?: string) => Promise<ReportTable>> = {
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

async function safeGetObjectBase64(key: string): Promise<string | null> {
  try {
    return await getObjectBase64(key);
  } catch {
    return null;
  }
}

async function getDefaultLogoBase64(origin: string): Promise<string | null> {
  try {
    const response = await fetch(`${origin}/brand/reis-logo-color.png`);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const session = await auth();
  if (!session?.user || !["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const { tipo } = await params;
  const getReport = REPORTS[tipo];
  if (!getReport) {
    return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "xlsx";
  const workId = url.searchParams.get("workId") ?? undefined;

  const report = await getReport(workId);
  const fileSlug = tipo;

  if (format === "xlsx") {
    const buffer = await buildXlsxBuffer(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileSlug}.xlsx"`,
      },
    });
  }

  const company = await prisma.companySettings.findFirst();
  const logoBase64 = company?.logoUrl
    ? await safeGetObjectBase64(company.logoUrl)
    : await getDefaultLogoBase64(url.origin);

  const buffer = await renderToBuffer(<ReportPdfDocument report={report} company={company} logoBase64={logoBase64} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileSlug}.pdf"`,
    },
  });
}
