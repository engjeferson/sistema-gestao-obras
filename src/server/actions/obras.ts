"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { workFormSchema } from "@/lib/validations/obras";
import type { WorkStatus } from "@/generated/prisma/enums";

async function findOrCreateClientId(nome: string | undefined) {
  const trimmed = nome?.trim();
  if (!trimmed) return null;
  const existing = await prisma.client.findFirst({ where: { nome: trimmed } });
  if (existing) return existing.id;
  const created = await prisma.client.create({ data: { nome: trimmed } });
  return created.id;
}

function parseWorkForm(formData: FormData) {
  return workFormSchema.safeParse({
    nome: formData.get("nome"),
    codigo: formData.get("codigo"),
    clienteNome: formData.get("clienteNome") ?? undefined,
    telefone: formData.get("telefone") ?? undefined,
    endereco: formData.get("endereco") ?? undefined,
    valorContrato: formData.get("valorContrato"),
    areaConstruida: formData.get("areaConstruida") ?? "",
    dataInicio: formData.get("dataInicio"),
    dataPrevistaTermino: formData.get("dataPrevistaTermino"),
    status: formData.get("status"),
    observacoes: formData.get("observacoes") ?? undefined,
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

  const existingCodigo = await prisma.work.findUnique({ where: { codigo: data.codigo } });
  if (existingCodigo) {
    return "Já existe uma obra com esse código.";
  }

  const clientId = await findOrCreateClientId(data.clienteNome);

  const work = await prisma.work.create({
    data: {
      nome: data.nome,
      codigo: data.codigo,
      clientId,
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

  const existingCodigo = await prisma.work.findUnique({ where: { codigo: data.codigo } });
  if (existingCodigo && existingCodigo.id !== workId) {
    return "Já existe uma obra com esse código.";
  }

  const clientId = await findOrCreateClientId(data.clienteNome);

  await prisma.work.update({
    where: { id: workId },
    data: {
      nome: data.nome,
      codigo: data.codigo,
      clientId,
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
    include: { client: true },
  });
}

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
