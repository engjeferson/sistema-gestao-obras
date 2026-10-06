"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole, ForbiddenError } from "@/lib/permissions";
import { getCurrentModulePermissions } from "@/server/actions/permissions";
import { preLancamentoFormSchema } from "@/lib/validations/pre-lancamentos";
import { extractPreLancamento } from "@/lib/ai/pre-lancamento-extraction";
import { getObjectBase64 } from "@/lib/r2";
import type { Role, PreLancamentoStatus } from "@/generated/prisma/enums";
import type { Session } from "next-auth";

const FINANCEIRO_EDIT_ROLES: Role[] = ["ADMINISTRADOR", "FINANCEIRO", "ENGENHEIRO"];

async function assertCanEditFinanceiro(session: Session) {
  if (session.user.role !== "ENGENHEIRO") return;
  const modulePerms = await getCurrentModulePermissions();
  if (modulePerms.financeiroSomenteLeitura) {
    throw new ForbiddenError("Você só tem acesso de visualização ao Financeiro.");
  }
}

async function resolveFavorecidoIds(tipo: "PAGAR" | "RECEBER", nome: string) {
  const trimmed = nome.trim();
  if (!trimmed) return { supplierId: null, clientId: null };
  if (tipo === "PAGAR") {
    const existing = await prisma.supplier.findFirst({ where: { nome: trimmed } });
    return { supplierId: existing?.id ?? null, clientId: null };
  }
  const existing = await prisma.client.findFirst({ where: { nome: trimmed } });
  return { supplierId: null, clientId: existing?.id ?? null };
}

const PAGE_SIZE = 20;

export async function listPreLancamentos(status: PreLancamentoStatus, page = 1) {
  const where = { status };
  const [items, totalCount] = await Promise.all([
    prisma.preLancamento.findMany({
      where,
      include: { work: true, stage: true, categoria: true, attachments: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.preLancamento.count({ where }),
  ]);

  return { items, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page };
}

export async function countPreLancamentosByStatus() {
  const counts = await prisma.preLancamento.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  return {
    PENDENTE: byStatus.get("PENDENTE") ?? 0,
    RECUSADO: byStatus.get("RECUSADO") ?? 0,
    FINALIZADO: byStatus.get("FINALIZADO") ?? 0,
  };
}

export async function getPreLancamento(id: string) {
  return prisma.preLancamento.findUnique({
    where: { id },
    include: { work: true, stage: true, categoria: true, attachments: { orderBy: { createdAt: "asc" } } },
  });
}

function parseAttachments(formData: FormData): { url: string; nome: string }[] {
  const raw = formData.get("attachmentsJson");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a): a is { url: string; nome: string } => typeof a?.url === "string" && typeof a?.nome === "string")
      .map((a) => ({ url: a.url, nome: a.nome }));
  } catch {
    return [];
  }
}

function parsePreLancamentoForm(formData: FormData) {
  return preLancamentoFormSchema.safeParse({
    workId: formData.get("workId") ?? undefined,
    stageId: formData.get("stageId") ?? undefined,
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    categoriaId: formData.get("categoriaId") ?? undefined,
    favorecidoNome: formData.get("favorecidoNome") ?? undefined,
    valor: formData.get("valor"),
    dataVencimento: formData.get("dataVencimento") ?? undefined,
    observacao: formData.get("observacao") ?? undefined,
  });
}

export async function createPreLancamento(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  const parsed = parsePreLancamentoForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const attachments = parseAttachments(formData);
  const origem = formData.get("origem") === "IA" ? "IA" : "MANUAL";
  const rawInput = (formData.get("rawInput") as string) || null;

  await prisma.preLancamento.create({
    data: {
      workId: data.workId || null,
      stageId: data.stageId || null,
      tipo: data.tipo,
      descricao: data.descricao,
      categoriaId: data.categoriaId || null,
      favorecidoNome: data.favorecidoNome || null,
      valor: data.valor,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
      observacao: data.observacao || null,
      origem,
      rawInput,
      createdById: session.user.id,
      attachments: { create: attachments },
    },
  });

  revalidatePath("/financeiro/pre-lancamentos");
  redirect("/financeiro/pre-lancamentos");
}

export async function updatePreLancamento(id: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  const parsed = parsePreLancamentoForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const attachments = parseAttachments(formData);

  await prisma.preLancamento.update({
    where: { id },
    data: {
      workId: data.workId || null,
      stageId: data.stageId || null,
      tipo: data.tipo,
      descricao: data.descricao,
      categoriaId: data.categoriaId || null,
      favorecidoNome: data.favorecidoNome || null,
      valor: data.valor,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
      observacao: data.observacao || null,
      attachments: { deleteMany: {}, create: attachments },
    },
  });

  revalidatePath("/financeiro/pre-lancamentos");
  redirect("/financeiro/pre-lancamentos");
}

export async function deletePreLancamento(id: string) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  await prisma.preLancamento.delete({ where: { id } });
  revalidatePath("/financeiro/pre-lancamentos");
}

export async function rejectPreLancamento(id: string, motivo?: string) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  await prisma.preLancamento.update({
    where: { id },
    data: { status: "RECUSADO", motivoRecusa: motivo?.trim() || null },
  });
  revalidatePath("/financeiro/pre-lancamentos");
}

export async function reopenPreLancamento(id: string) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  await prisma.preLancamento.update({ where: { id }, data: { status: "PENDENTE", motivoRecusa: null } });
  revalidatePath("/financeiro/pre-lancamentos");
}

// Aprovar exige os campos que o FinancialTransaction não abre mão de ter (categoria e
// vencimento) — diferente do resto do pré-lançamento, que pode ficar incompleto até aqui.
export async function approvePreLancamento(id: string) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  const preLancamento = await prisma.preLancamento.findUnique({ where: { id }, include: { attachments: true } });
  if (!preLancamento) {
    throw new Error("Pré-lançamento não encontrado.");
  }
  if (preLancamento.status === "FINALIZADO") {
    throw new Error("Este pré-lançamento já foi finalizado.");
  }
  if (!preLancamento.categoriaId) {
    throw new Error("Selecione uma categoria antes de aprovar.");
  }
  if (!preLancamento.dataVencimento) {
    throw new Error("Preencha a data de vencimento antes de aprovar.");
  }
  if (!preLancamento.favorecidoNome?.trim()) {
    throw new Error("Preencha o fornecedor/cliente antes de aprovar.");
  }

  const { supplierId, clientId } = await resolveFavorecidoIds(preLancamento.tipo, preLancamento.favorecidoNome);

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        workId: preLancamento.workId,
        tipo: preLancamento.tipo,
        descricao: preLancamento.descricao,
        categoriaId: preLancamento.categoriaId!,
        favorecidoNome: preLancamento.favorecidoNome!,
        supplierId,
        clientId,
        stageId: preLancamento.stageId,
        valor: preLancamento.valor,
        dataEmissao: new Date(),
        dataVencimento: preLancamento.dataVencimento!,
        status: "PENDENTE",
        observacao: preLancamento.observacao,
        createdById: session.user.id,
      },
    });

    await tx.preLancamento.update({
      where: { id },
      data: { status: "FINALIZADO", financialTransactionId: transaction.id },
    });
  });

  revalidatePath("/financeiro/pre-lancamentos");
  revalidatePath("/financeiro");
  if (preLancamento.workId) {
    revalidatePath(`/obras/${preLancamento.workId}/financeiro`);
  }
}

export async function extractPreLancamentoDraft(input: { text?: string; imageKey?: string }) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  const [works, categorias] = await Promise.all([
    prisma.work.findMany({ where: { status: { not: "CONCLUIDA" } }, select: { id: true, nome: true } }),
    prisma.financialCategory.findMany({ where: { ativo: true }, select: { id: true, nome: true } }),
  ]);

  let imageBase64: string | undefined;
  let imageMediaType: string | undefined;
  if (input.imageKey) {
    imageBase64 = await getObjectBase64(input.imageKey);
    const ext = input.imageKey.split(".").pop()?.toLowerCase();
    imageMediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  }

  const extracted = await extractPreLancamento({
    text: input.text,
    imageBase64,
    imageMediaType,
    works: works.map((w) => w.nome),
    categorias: categorias.map((c) => c.nome),
  });

  const matchedWork = extracted.workNome
    ? works.find((w) => w.nome.toLowerCase() === extracted.workNome!.toLowerCase())
    : undefined;
  const matchedCategoria = extracted.categoriaNome
    ? categorias.find((c) => c.nome.toLowerCase() === extracted.categoriaNome!.toLowerCase())
    : undefined;

  return {
    tipo: extracted.tipo,
    descricao: extracted.descricao,
    valor: extracted.valor,
    favorecidoNome: extracted.favorecidoNome ?? "",
    dataVencimento: extracted.dataVencimento ?? "",
    observacao: extracted.observacao ?? "",
    workId: matchedWork?.id ?? "",
    categoriaId: matchedCategoria?.id ?? "",
  };
}
