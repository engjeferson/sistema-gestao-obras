"use server";

import { prisma } from "@/lib/prisma";
import { getBudgetVsActualByStage } from "@/server/actions/orcamento";
import {
  formatCurrencyBRL,
  formatDateBR,
  TRANSACTION_STATUS_LABELS,
} from "@/lib/status-labels";
import type { ReportTable } from "@/lib/reports";

export type { ReportTable } from "@/lib/reports";

export async function listCostHistory(search?: string) {
  const items = await prisma.invoiceItem.findMany({
    where: search ? { material: { contains: search, mode: "insensitive" } } : undefined,
    include: { invoice: { include: { work: true, supplier: true, stage: true } } },
    orderBy: { invoice: { dataEmissao: "desc" } },
    take: 100,
  });

  return items.map((item) => ({
    id: item.id,
    material: item.material,
    quantidade: Number(item.quantidade),
    unidade: item.unidade,
    valorUnitario: Number(item.valorUnitario),
    valorTotal: Number(item.valorTotal),
    fornecedorNome: item.invoice.supplier.nome,
    dataEmissao: item.invoice.dataEmissao,
    workNome: item.invoice.work?.nome ?? "Estoque Geral",
    stageNome: item.invoice.stage?.nome ?? null,
  }));
}

export async function listWorksForFilter() {
  return prisma.work.findMany({ select: { id: true, nome: true, codigo: true }, orderBy: { nome: "asc" } });
}

async function requireWork(workId?: string) {
  const work = workId
    ? await prisma.work.findUnique({ where: { id: workId } })
    : await prisma.work.findFirst({ orderBy: { createdAt: "desc" } });
  return work;
}

export async function getReportOrcamentoObra(workId?: string): Promise<ReportTable> {
  const work = await requireWork(workId);
  if (!work) return { title: "Orçamento da obra", columns: [], rows: [] };

  const stages = await getBudgetVsActualByStage(work.id);
  const rows: Record<string, string>[] = [];
  for (const stage of stages) {
    rows.push({ nivel: "Etapa", codigo: stage.codigo ?? "", nome: stage.nome, orcado: formatCurrencyBRL(stage.orcado) });
    for (const task of stage.tasks) {
      rows.push({
        nivel: "Atividade",
        codigo: task.codigo ?? "",
        nome: task.nome,
        orcado: formatCurrencyBRL(task.orcado),
      });
    }
  }

  return {
    title: "Orçamento da obra",
    subtitle: `${work.codigo} — ${work.nome}`,
    columns: [
      { key: "nivel", label: "Nível" },
      { key: "codigo", label: "Código" },
      { key: "nome", label: "Etapa / Atividade" },
      { key: "orcado", label: "Orçado" },
    ],
    rows,
  };
}

export async function getReportPrevistoRealizado(workId?: string): Promise<ReportTable> {
  const work = await requireWork(workId);
  if (!work) return { title: "Previsto x realizado", columns: [], rows: [] };

  const stages = await getBudgetVsActualByStage(work.id);
  const rows: Record<string, string>[] = [];
  for (const stage of stages) {
    rows.push({
      nivel: "Etapa",
      nome: `${stage.codigo ? `${stage.codigo} — ` : ""}${stage.nome}`,
      orcado: formatCurrencyBRL(stage.orcado),
      realizado: formatCurrencyBRL(stage.realizado),
      aPagar: formatCurrencyBRL(stage.aPagar),
      projetado: formatCurrencyBRL(stage.projetado),
      saldo: formatCurrencyBRL(stage.saldo),
    });
    for (const task of stage.tasks) {
      rows.push({
        nivel: "Atividade",
        nome: `${task.codigo ? `${task.codigo} — ` : ""}${task.nome}`,
        orcado: formatCurrencyBRL(task.orcado),
        realizado: formatCurrencyBRL(task.realizado),
        aPagar: formatCurrencyBRL(task.aPagar),
        projetado: formatCurrencyBRL(task.projetado),
        saldo: formatCurrencyBRL(task.saldo),
      });
    }
  }

  return {
    title: "Previsto x realizado",
    subtitle: `${work.codigo} — ${work.nome}`,
    columns: [
      { key: "nivel", label: "Nível" },
      { key: "nome", label: "Etapa / Atividade" },
      { key: "orcado", label: "Orçado" },
      { key: "realizado", label: "Realizado" },
      { key: "aPagar", label: "A pagar" },
      { key: "projetado", label: "Projetado" },
      { key: "saldo", label: "Saldo" },
    ],
    rows,
  };
}

export async function getReportCustosPorEtapa(workId?: string): Promise<ReportTable> {
  const work = await requireWork(workId);
  if (!work) return { title: "Custos por etapa", columns: [], rows: [] };

  const stages = await getBudgetVsActualByStage(work.id);
  return {
    title: "Custos por etapa",
    subtitle: `${work.codigo} — ${work.nome}`,
    columns: [
      { key: "nome", label: "Etapa" },
      { key: "orcado", label: "Orçado" },
      { key: "realizado", label: "Realizado" },
      { key: "aPagar", label: "A pagar" },
      { key: "projetado", label: "Projetado (comprometido)" },
      { key: "saldo", label: "Saldo" },
    ],
    rows: stages.map((stage) => ({
      nome: `${stage.codigo ? `${stage.codigo} — ` : ""}${stage.nome}`,
      orcado: formatCurrencyBRL(stage.orcado),
      realizado: formatCurrencyBRL(stage.realizado),
      aPagar: formatCurrencyBRL(stage.aPagar),
      projetado: formatCurrencyBRL(stage.projetado),
      saldo: formatCurrencyBRL(stage.saldo),
    })),
  };
}

export async function getReportFisicoFinanceiro(workId?: string): Promise<ReportTable> {
  const work = await requireWork(workId);
  if (!work) return { title: "Físico x financeiro", columns: [], rows: [] };

  const stages = await getBudgetVsActualByStage(work.id);
  return {
    title: "Físico x financeiro",
    subtitle: `${work.codigo} — ${work.nome}`,
    columns: [
      { key: "nome", label: "Etapa" },
      { key: "fisico", label: "Físico" },
      { key: "financeiro", label: "Financeiro" },
      { key: "diferenca", label: "Diferença" },
      { key: "status", label: "Status" },
    ],
    rows: stages.map((stage) => ({
      nome: `${stage.codigo ? `${stage.codigo} — ` : ""}${stage.nome}`,
      fisico: `${stage.avancoFisico.toFixed(0)}%`,
      financeiro: `${stage.avancoFinanceiro.toFixed(0)}%`,
      diferenca: `${stage.diferenca.toFixed(0)}pp`,
      status: stage.status === "ATENCAO" ? "Atenção" : "Dentro do esperado",
    })),
  };
}

export async function getReportDespesasPorObra(): Promise<ReportTable> {
  const works = await prisma.work.findMany({ orderBy: { nome: "asc" } });
  const rows = await Promise.all(
    works.map(async (work) => {
      const [realizadoAgg, aPagarAgg] = await Promise.all([
        prisma.financialTransaction.aggregate({
          where: { workId: work.id, tipo: "PAGAR", status: "PAGO" },
          _sum: { valor: true },
        }),
        prisma.financialTransaction.aggregate({
          where: { workId: work.id, tipo: "PAGAR", status: { in: ["PENDENTE", "VENCIDO"] } },
          _sum: { valor: true },
        }),
      ]);
      const realizado = Number(realizadoAgg._sum.valor ?? 0);
      const aPagar = Number(aPagarAgg._sum.valor ?? 0);
      return {
        obra: `${work.codigo} — ${work.nome}`,
        realizado: formatCurrencyBRL(realizado),
        aPagar: formatCurrencyBRL(aPagar),
        total: formatCurrencyBRL(realizado + aPagar),
      };
    }),
  );

  return {
    title: "Despesas por obra",
    columns: [
      { key: "obra", label: "Obra" },
      { key: "realizado", label: "Realizado" },
      { key: "aPagar", label: "A pagar" },
      { key: "total", label: "Total" },
    ],
    rows,
  };
}

export async function getReportDespesasPorFornecedor(): Promise<ReportTable> {
  const grouped = await prisma.financialTransaction.groupBy({
    by: ["supplierId", "status"],
    where: { tipo: "PAGAR", supplierId: { not: null } },
    _sum: { valor: true },
  });

  const supplierIds = [...new Set(grouped.map((g) => g.supplierId).filter((id): id is string => !!id))];
  const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierIds } } });
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.nome]));

  const bySupplier = new Map<string, { realizado: number; aPagar: number }>();
  for (const g of grouped) {
    if (!g.supplierId) continue;
    const entry = bySupplier.get(g.supplierId) ?? { realizado: 0, aPagar: 0 };
    const valor = Number(g._sum.valor ?? 0);
    if (g.status === "PAGO") entry.realizado += valor;
    else entry.aPagar += valor;
    bySupplier.set(g.supplierId, entry);
  }

  const rows = [...bySupplier.entries()]
    .map(([supplierId, { realizado, aPagar }]) => ({
      fornecedor: supplierMap.get(supplierId) ?? "—",
      realizado: formatCurrencyBRL(realizado),
      aPagar: formatCurrencyBRL(aPagar),
      total: formatCurrencyBRL(realizado + aPagar),
      _total: realizado + aPagar,
    }))
    .sort((a, b) => b._total - a._total)
    .map(({ _total: _unused, ...rest }) => rest);

  return {
    title: "Despesas por fornecedor",
    columns: [
      { key: "fornecedor", label: "Fornecedor" },
      { key: "realizado", label: "Realizado" },
      { key: "aPagar", label: "A pagar" },
      { key: "total", label: "Total" },
    ],
    rows,
  };
}

export async function getReportDespesasPorCategoria(): Promise<ReportTable> {
  const grouped = await prisma.financialTransaction.groupBy({
    by: ["categoriaId", "status"],
    where: { tipo: "PAGAR" },
    _sum: { valor: true },
  });

  const categoriaIds = [...new Set(grouped.map((g) => g.categoriaId))];
  const categorias = await prisma.financialCategory.findMany({ where: { id: { in: categoriaIds } } });
  const categoriaMap = new Map(categorias.map((c) => [c.id, c.nome]));

  const byCategoria = new Map<string, { realizado: number; aPagar: number }>();
  for (const g of grouped) {
    const entry = byCategoria.get(g.categoriaId) ?? { realizado: 0, aPagar: 0 };
    const valor = Number(g._sum.valor ?? 0);
    if (g.status === "PAGO") entry.realizado += valor;
    else entry.aPagar += valor;
    byCategoria.set(g.categoriaId, entry);
  }

  const rows = [...byCategoria.entries()]
    .map(([categoriaId, { realizado, aPagar }]) => ({
      categoria: categoriaMap.get(categoriaId) ?? "—",
      realizado: formatCurrencyBRL(realizado),
      aPagar: formatCurrencyBRL(aPagar),
      total: formatCurrencyBRL(realizado + aPagar),
      _total: realizado + aPagar,
    }))
    .sort((a, b) => b._total - a._total)
    .map(({ _total: _unused, ...rest }) => rest);

  return {
    title: "Despesas por categoria",
    columns: [
      { key: "categoria", label: "Categoria" },
      { key: "realizado", label: "Realizado" },
      { key: "aPagar", label: "A pagar" },
      { key: "total", label: "Total" },
    ],
    rows,
  };
}

export async function getReportNotasFiscaisPorObra(workId?: string): Promise<ReportTable> {
  const invoices = await prisma.invoice.findMany({
    where: workId ? { workId } : undefined,
    include: { work: true, supplier: true },
    orderBy: { dataEmissao: "desc" },
    take: 200,
  });

  return {
    title: "Notas fiscais por obra",
    subtitle: workId ? undefined : "Todas as obras",
    columns: [
      { key: "numero", label: "NF" },
      { key: "obra", label: "Obra" },
      { key: "fornecedor", label: "Fornecedor" },
      { key: "data", label: "Data" },
      { key: "valor", label: "Valor" },
    ],
    rows: invoices.map((invoice) => ({
      numero: invoice.numero,
      obra: invoice.work ? `${invoice.work.codigo} — ${invoice.work.nome}` : "Estoque Geral",
      fornecedor: invoice.supplier.nome,
      data: formatDateBR(invoice.dataEmissao),
      valor: formatCurrencyBRL(Number(invoice.valorTotal)),
    })),
  };
}

export async function getReportContasAPagarPorObra(workId?: string): Promise<ReportTable> {
  const transactions = await prisma.financialTransaction.findMany({
    where: { tipo: "PAGAR", status: { in: ["PENDENTE", "VENCIDO"] }, workId },
    include: { work: true },
    orderBy: { dataVencimento: "asc" },
    take: 200,
  });

  return {
    title: "Contas a pagar por obra",
    subtitle: workId ? undefined : "Todas as obras",
    columns: [
      { key: "descricao", label: "Descrição" },
      { key: "obra", label: "Obra" },
      { key: "vencimento", label: "Vencimento" },
      { key: "valor", label: "Valor" },
      { key: "status", label: "Status" },
    ],
    rows: transactions.map((t) => ({
      descricao: t.descricao,
      obra: t.work ? `${t.work.codigo} — ${t.work.nome}` : "Despesa geral",
      vencimento: formatDateBR(t.dataVencimento),
      valor: formatCurrencyBRL(Number(t.valor)),
      status: TRANSACTION_STATUS_LABELS[t.status],
    })),
  };
}
