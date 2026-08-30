"use server";

import { prisma } from "@/lib/prisma";
import { getWorkCostSummary, getWorkAlerts } from "@/server/actions/orcamento";
import { getCurrentWorkAccess } from "@/server/actions/permissions";
import type { BudgetAlert } from "@/lib/budget";

export async function getDashboardData() {
  const workAccess = await getCurrentWorkAccess();
  const workWhere = workAccess !== null ? { id: { in: workAccess } } : {};
  const txWorkWhere = workAccess !== null ? { workId: { in: workAccess } } : {};

  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const em7Dias = new Date(hoje);
  em7Dias.setUTCDate(em7Dias.getUTCDate() + 7);
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const inicioProximoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));

  const [
    obrasEmAndamento,
    obrasConcluidas,
    totalAPagarAgg,
    contasVencidas,
    contasAVencer,
    contasAReceberAgg,
    gastoMesAgg,
    receitaMesAgg,
    gastoPorObraRaw,
    ultimosLancamentos,
    ultimosRdos,
    proximasAtividades,
    contasProximasVencimento,
  ] = await Promise.all([
    prisma.work.count({ where: { ...workWhere, status: "EM_ANDAMENTO" } }),
    prisma.work.count({ where: { ...workWhere, status: "CONCLUIDA" } }),
    prisma.financialTransaction.aggregate({
      where: { ...txWorkWhere, tipo: "PAGAR", status: { in: ["PENDENTE", "VENCIDO"] } },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.count({
      where: { ...txWorkWhere, tipo: "PAGAR", status: "PENDENTE", dataVencimento: { lt: hoje } },
    }),
    prisma.financialTransaction.count({
      where: { ...txWorkWhere, tipo: "PAGAR", status: "PENDENTE", dataVencimento: { gte: hoje, lte: em7Dias } },
    }),
    prisma.financialTransaction.aggregate({
      where: { ...txWorkWhere, tipo: "RECEBER", status: { in: ["PENDENTE", "VENCIDO"] } },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { ...txWorkWhere, tipo: "PAGAR", dataEmissao: { gte: inicioMes, lt: inicioProximoMes } },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { ...txWorkWhere, tipo: "RECEBER", status: "PAGO", dataPagamento: { gte: inicioMes, lt: inicioProximoMes } },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ["workId"],
      where: { ...txWorkWhere, tipo: "PAGAR" },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.findMany({
      where: txWorkWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { work: true, categoria: true },
    }),
    prisma.rdo.findMany({
      where: txWorkWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { work: true, responsavel: true },
    }),
    prisma.planningTask.findMany({
      where: { ...txWorkWhere, status: { in: ["NAO_INICIADA", "EM_ANDAMENTO"] } },
      orderBy: { dataInicioPrevista: "asc" },
      take: 5,
      include: { work: true },
    }),
    prisma.financialTransaction.findMany({
      where: { ...txWorkWhere, status: "PENDENTE", dataVencimento: { gte: hoje, lte: em7Dias } },
      orderBy: { dataVencimento: "asc" },
      take: 5,
      include: { work: true },
    }),
  ]);

  const receitaTotalPagaAgg = await prisma.financialTransaction.aggregate({
    where: { ...txWorkWhere, tipo: "RECEBER", status: "PAGO" },
    _sum: { valor: true },
  });
  const gastoTotalAgg = await prisma.financialTransaction.aggregate({
    where: { ...txWorkWhere, tipo: "PAGAR" },
    _sum: { valor: true },
  });

  const works = await prisma.work.findMany({ where: workWhere, select: { id: true, nome: true, codigo: true } });
  const workMap = new Map(works.map((w) => [w.id, w]));
  const gastoPorObra = gastoPorObraRaw
    .map((item) => ({
      work: item.workId ? workMap.get(item.workId) : undefined,
      valor: Number(item._sum.valor ?? 0),
    }))
    .filter((item) => item.work)
    .sort((a, b) => b.valor - a.valor);

  return {
    obrasEmAndamento,
    obrasConcluidas,
    totalAPagar: Number(totalAPagarAgg._sum.valor ?? 0),
    contasVencidas,
    contasAVencer,
    contasAReceber: Number(contasAReceberAgg._sum.valor ?? 0),
    gastoMes: Number(gastoMesAgg._sum.valor ?? 0),
    receitaMes: Number(receitaMesAgg._sum.valor ?? 0),
    saldoFinanceiro: Number(receitaTotalPagaAgg._sum.valor ?? 0) - Number(gastoTotalAgg._sum.valor ?? 0),
    gastoPorObra,
    ultimosLancamentos: ultimosLancamentos.map((t) => ({
      id: t.id,
      descricao: t.descricao,
      valor: Number(t.valor),
      tipo: t.tipo,
      workNome: t.work?.nome ?? "Despesa geral",
      categoriaNome: t.categoria.nome,
    })),
    ultimosRdos: ultimosRdos.map((r) => ({
      id: r.id,
      numero: r.numero,
      data: r.data,
      workId: r.workId,
      workNome: r.work.nome,
      responsavelNome: r.responsavel.name,
    })),
    proximasAtividades: proximasAtividades.map((t) => ({
      id: t.id,
      nome: t.nome,
      workNome: t.work.nome,
      dataInicioPrevista: t.dataInicioPrevista,
    })),
    contasProximasVencimento: contasProximasVencimento.map((t) => ({
      id: t.id,
      descricao: t.descricao,
      valor: Number(t.valor),
      dataVencimento: t.dataVencimento,
      workNome: t.work?.nome ?? "Despesa geral",
    })),
  };
}

export async function getCompanyOverview() {
  const workAccess = await getCurrentWorkAccess();
  const works = await prisma.work.findMany({
    where: workAccess !== null ? { id: { in: workAccess } } : {},
    orderBy: { createdAt: "desc" },
  });
  const summaries = await Promise.all(works.map((work) => getWorkCostSummary(work.id)));
  const valid = summaries.filter((s): s is NonNullable<typeof s> => s !== null);

  const valorTotalContratado = valid.reduce((sum, w) => sum + w.contrato, 0);
  const custoTotalOrcado = valid.reduce((sum, w) => sum + w.orcado, 0);
  const custoRealizado = valid.reduce((sum, w) => sum + w.realizado, 0);
  const contasAPagarTotal = valid.reduce((sum, w) => sum + w.aPagar, 0);
  const margemMediaProjetada =
    valid.length > 0 ? valid.reduce((sum, w) => sum + w.margemProjetada, 0) / valid.length : 0;

  const obrasRows = valid.map((w) => ({
    id: w.work.id,
    nome: w.work.nome,
    codigo: w.work.codigo,
    status: w.work.status,
    avancoFisico: w.avancoFisico,
    contrato: w.contrato,
    orcado: w.orcado,
    realizado: w.realizado,
    aPagar: w.aPagar,
    margemProjetada: w.margemProjetada,
  }));

  return { valorTotalContratado, custoTotalOrcado, custoRealizado, contasAPagarTotal, margemMediaProjetada, obrasRows };
}

export async function getGlobalAlerts(): Promise<BudgetAlert[]> {
  const workAccess = await getCurrentWorkAccess();
  const works = await prisma.work.findMany({
    where: { ...(workAccess !== null ? { id: { in: workAccess } } : {}), status: "EM_ANDAMENTO" },
    select: { id: true, nome: true },
  });
  const results = await Promise.all(
    works.map(async (work) => {
      const alerts = await getWorkAlerts(work.id);
      return alerts.map((alert) => ({ ...alert, mensagem: `${work.nome}: ${alert.mensagem}` }));
    }),
  );
  return results.flat();
}
