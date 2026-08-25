"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { workFormSchema } from "@/lib/validations/obras";
import type { WorkStatus } from "@/generated/prisma/enums";

/**
 * Gera o próximo código sequencial (ex.: "003") a partir do maior número já
 * usado em qualquer código existente — funciona com os formatos livres já
 * cadastrados ("002", "OBRA-001"). Usado quando o usuário não digita um
 * código manualmente na criação da obra.
 */
async function gerarProximoCodigo(): Promise<string> {
  const works = await prisma.work.findMany({ select: { codigo: true } });
  const max = works.reduce((acc, w) => {
    const match = w.codigo.match(/(\d+)/);
    return Math.max(acc, match ? parseInt(match[1], 10) : 0);
  }, 0);
  return String(max + 1).padStart(3, "0");
}

function parseWorkForm(formData: FormData) {
  return workFormSchema.safeParse({
    nome: formData.get("nome"),
    codigo: formData.get("codigo") ?? undefined,
    clientId: formData.get("clientId"),
    responsavelTecnicoId: formData.get("responsavelTecnicoId") ?? undefined,
    encarregadoId: formData.get("encarregadoId") ?? undefined,
    telefone: formData.get("telefone") ?? undefined,
    endereco: formData.get("endereco") ?? undefined,
    valorContrato: formData.get("valorContrato"),
    areaConstruida: formData.get("areaConstruida") ?? "",
    dataInicio: formData.get("dataInicio"),
    dataPrevistaTermino: formData.get("dataPrevistaTermino"),
    status: formData.get("status"),
    observacoes: formData.get("observacoes") ?? undefined,
    renderUrl: formData.get("renderUrl") ?? undefined,
  });
}

export async function createWork(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseWorkForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const codigo = data.codigo || (await gerarProximoCodigo());
  const existingCodigo = await prisma.work.findUnique({ where: { codigo } });
  if (existingCodigo) {
    return "Já existe uma obra com esse código.";
  }

  const work = await prisma.work.create({
    data: {
      nome: data.nome,
      codigo,
      clientId: data.clientId,
      responsavelTecnicoId: data.responsavelTecnicoId || null,
      encarregadoId: data.encarregadoId || null,
      telefone: data.telefone || null,
      endereco: data.endereco || null,
      valorContrato: data.valorContrato,
      areaConstruida: data.areaConstruida ?? null,
      dataInicio: new Date(data.dataInicio),
      dataPrevistaTermino: new Date(data.dataPrevistaTermino),
      status: data.status,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/obras");
  redirect(`/obras/${work.id}`);
}

export async function updateWork(workId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseWorkForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const codigo = data.codigo || (await gerarProximoCodigo());
  const existingCodigo = await prisma.work.findUnique({ where: { codigo } });
  if (existingCodigo && existingCodigo.id !== workId) {
    return "Já existe uma obra com esse código.";
  }

  await prisma.work.update({
    where: { id: workId },
    data: {
      nome: data.nome,
      codigo,
      clientId: data.clientId,
      responsavelTecnicoId: data.responsavelTecnicoId || null,
      encarregadoId: data.encarregadoId || null,
      telefone: data.telefone || null,
      endereco: data.endereco || null,
      valorContrato: data.valorContrato,
      areaConstruida: data.areaConstruida ?? null,
      dataInicio: new Date(data.dataInicio),
      dataPrevistaTermino: new Date(data.dataPrevistaTermino),
      status: data.status,
      observacoes: data.observacoes || null,
      renderUrl: data.renderUrl || null,
    },
  });

  revalidatePath("/obras");
  revalidatePath(`/obras/${workId}`);
  redirect(`/obras/${workId}`);
}

export async function updateWorkStatus(workId: string, status: WorkStatus) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.work.update({ where: { id: workId }, data: { status } });
  revalidatePath("/obras");
  revalidatePath(`/obras/${workId}`);
}

export async function listWorks(filters?: { status?: WorkStatus; search?: string }) {
  return prisma.work.findMany({
    where: {
      status: filters?.status,
      ...(filters?.search
        ? {
            OR: [
              { nome: { contains: filters.search, mode: "insensitive" } },
              { codigo: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWork(workId: string) {
  return prisma.work.findUnique({
    where: { id: workId },
    include: { client: true, responsavelTecnico: true, encarregado: true },
  });
}

const ACTIVE_STATUSES = ["PLANEJAMENTO", "EM_ANDAMENTO"] as const;

export async function getObrasDashboard() {
  const [works, totalCount] = await Promise.all([
    prisma.work.findMany({
      include: { client: true, responsavelTecnico: true, encarregado: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.work.count(),
  ]);

  const workIds = works.map((w) => w.id);
  const hoje = new Date();
  const inicioHoje = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  const fimHoje = new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000);

  const [
    progressoAgg,
    atrasadasAgg,
    custoTotalAgg,
    despesasPagasAgg,
    receitasRecebidasAgg,
    rdosRecentes,
    despesasDoDia,
    receitasDoDia,
    despesasEmAberto,
    receitasEmAberto,
    despesasPagasGlobal,
    receitasRecebidasGlobal,
  ] = await Promise.all([
    prisma.planningTask.groupBy({
      by: ["workId"],
      where: { workId: { in: workIds } },
      _avg: { percentualExecutado: true },
    }),
    prisma.planningTask.groupBy({
      by: ["workId"],
      where: { workId: { in: workIds }, status: "ATRASADA" },
      _count: { _all: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ["workId"],
      where: { workId: { in: workIds }, tipo: "PAGAR" },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ["workId"],
      where: { workId: { in: workIds }, tipo: "PAGAR", status: "PAGO" },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ["workId"],
      where: { workId: { in: workIds }, tipo: "RECEBER", status: "PAGO" },
      _sum: { valor: true },
    }),
    prisma.rdo.findMany({
      where: { workId: { in: workIds } },
      orderBy: { data: "desc" },
      include: { workers: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { tipo: "PAGAR", status: "PAGO", dataPagamento: { gte: inicioHoje, lt: fimHoje } },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { tipo: "RECEBER", status: "PAGO", dataPagamento: { gte: inicioHoje, lt: fimHoje } },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { tipo: "PAGAR", status: "PENDENTE" },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { tipo: "RECEBER", status: "PENDENTE" },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { tipo: "PAGAR", status: "PAGO" },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { tipo: "RECEBER", status: "PAGO" },
      _sum: { valor: true },
    }),
  ]);

  const progressoByWork = new Map(progressoAgg.map((p) => [p.workId, Number(p._avg.percentualExecutado ?? 0)]));
  const atrasadasByWork = new Map(atrasadasAgg.map((a) => [a.workId, a._count._all]));
  const custoTotalByWork = new Map(custoTotalAgg.map((c) => [c.workId, Number(c._sum.valor ?? 0)]));
  const despesasPagasByWork = new Map(despesasPagasAgg.map((d) => [d.workId, Number(d._sum.valor ?? 0)]));
  const receitasRecebidasByWork = new Map(receitasRecebidasAgg.map((r) => [r.workId, Number(r._sum.valor ?? 0)]));

  const efetivosByWork = new Map<string, number>();
  for (const rdo of rdosRecentes) {
    if (rdo.workId && !efetivosByWork.has(rdo.workId)) {
      efetivosByWork.set(rdo.workId, rdo.workers.reduce((sum, w) => sum + w.quantidade, 0));
    }
  }

  const rows = works.map((work) => {
    const receitas = receitasRecebidasByWork.get(work.id) ?? 0;
    const despesasPagas = despesasPagasByWork.get(work.id) ?? 0;
    const diasDecorridos = Math.max(
      0,
      Math.floor((hoje.getTime() - work.dataInicio.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return {
      id: work.id,
      codigo: work.codigo,
      nome: work.nome,
      status: work.status,
      client: work.client,
      responsavelTecnico: work.responsavelTecnico,
      encarregado: work.encarregado,
      dataPrevistaTermino: work.dataPrevistaTermino,
      percentualExecutado: progressoByWork.get(work.id) ?? 0,
      diasDecorridos,
      saudeFinanceira: receitas - despesasPagas,
      custoTotal: custoTotalByWork.get(work.id) ?? 0,
      atividadesAtrasadas: atrasadasByWork.get(work.id) ?? 0,
      efetivosNaObra: efetivosByWork.get(work.id) ?? 0,
    };
  });

  const ativasCount = works.filter((w) => (ACTIVE_STATUSES as readonly string[]).includes(w.status)).length;

  return {
    works: rows,
    totalCount,
    ativasCount,
    inativasCount: totalCount - ativasCount,
    kpis: {
      despesasDoDia: Number(despesasDoDia._sum.valor ?? 0),
      receitasDoDia: Number(receitasDoDia._sum.valor ?? 0),
      despesasEmAberto: Number(despesasEmAberto._sum.valor ?? 0),
      receitasEmAberto: Number(receitasEmAberto._sum.valor ?? 0),
      saudeFinanceiraGlobal: Number(receitasRecebidasGlobal._sum.valor ?? 0) - Number(despesasPagasGlobal._sum.valor ?? 0),
      hojeDateStr: inicioHoje.toISOString().slice(0, 10),
    },
  };
}

export type ObraDashboardRow = Awaited<ReturnType<typeof getObrasDashboard>>["works"][number];

export async function getWorkOverview(workId: string) {
  const work = await prisma.work.findUnique({ where: { id: workId } });
  if (!work) return null;

  const [gastoAgg, recebidoAgg, tasks, ultimosRdos] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: { workId, tipo: "PAGAR" },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { workId, tipo: "RECEBER", status: "PAGO" },
      _sum: { valor: true },
    }),
    prisma.planningTask.findMany({ where: { workId }, select: { percentualExecutado: true } }),
    prisma.rdo.findMany({
      where: { workId },
      orderBy: { data: "desc" },
      take: 3,
      include: { responsavel: true },
    }),
  ]);

  const gasto = Number(gastoAgg._sum.valor ?? 0);
  const recebido = Number(recebidoAgg._sum.valor ?? 0);
  const valorContrato = Number(work.valorContrato);
  const saldo = valorContrato - gasto;

  const percentualExecutado =
    tasks.length > 0
      ? tasks.reduce((sum, t) => sum + Number(t.percentualExecutado), 0) / tasks.length
      : 0;

  const hoje = new Date();
  const diasDeObra = Math.max(
    0,
    Math.floor((hoje.getTime() - work.dataInicio.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    work,
    valorContrato,
    gasto,
    recebido,
    saldo,
    percentualExecutado,
    diasDeObra,
    ultimosRdos,
  };
}
