"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { transactionFormSchema } from "@/lib/validations/financeiro";
import type { PaymentMethod, TransactionStatus, TransactionType } from "@/generated/prisma/enums";

export type TransactionFilters = {
  workId?: string;
  tipo?: TransactionType;
  categoriaId?: string;
  status?: TransactionStatus;
  favorecido?: string;
  dataInicio?: string;
  dataFim?: string;
  dataPagamentoInicio?: string;
  dataPagamentoFim?: string;
};

function parseTransactionForm(formData: FormData) {
  return transactionFormSchema.safeParse({
    workId: formData.get("workId"),
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    categoriaId: formData.get("categoriaId"),
    favorecidoNome: formData.get("favorecidoNome"),
    bankAccountId: formData.get("bankAccountId") ?? undefined,
    stageId: formData.get("stageId") ?? undefined,
    taskId: formData.get("taskId") ?? undefined,
    valor: formData.get("valor"),
    dataEmissao: formData.get("dataEmissao"),
    dataVencimento: formData.get("dataVencimento"),
    dataPagamento: formData.get("dataPagamento") ?? undefined,
    formaPagamento: formData.get("formaPagamento") ?? undefined,
    status: formData.get("status"),
    observacao: formData.get("observacao") ?? undefined,
    parcelar: formData.get("parcelar") === "on",
    numeroParcelas: formData.get("numeroParcelas") ?? undefined,
  });
}

async function resolveFavorecidoIds(tipo: "PAGAR" | "RECEBER", nome: string) {
  const trimmed = nome.trim();
  if (tipo === "PAGAR") {
    const existing = await prisma.supplier.findFirst({ where: { nome: trimmed } });
    return { supplierId: existing?.id ?? null, clientId: null };
  }
  const existing = await prisma.client.findFirst({ where: { nome: trimmed } });
  return { supplierId: null, clientId: existing?.id ?? null };
}

const PAGE_SIZE = 20;

async function healOverdueTransactions(filters?: TransactionFilters) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  const overdue = await prisma.financialTransaction.findMany({
    where: {
      workId: filters?.workId,
      categoriaId: filters?.categoriaId,
      favorecidoNome: filters?.favorecido ? { contains: filters.favorecido, mode: "insensitive" } : undefined,
      status: "PENDENTE",
      dataVencimento: { lt: hoje },
    },
    select: { id: true },
  });

  if (overdue.length > 0) {
    await prisma.financialTransaction.updateMany({
      where: { id: { in: overdue.map((t) => t.id) } },
      data: { status: "VENCIDO" },
    });
  }
}

export async function listTransactions(filters?: TransactionFilters, page = 1) {
  await healOverdueTransactions(filters);

  const where = {
    workId: filters?.workId,
    tipo: filters?.tipo,
    categoriaId: filters?.categoriaId,
    status: filters?.status,
    favorecidoNome: filters?.favorecido ? { contains: filters.favorecido, mode: "insensitive" as const } : undefined,
    dataVencimento: {
      gte: filters?.dataInicio ? new Date(filters.dataInicio) : undefined,
      lte: filters?.dataFim ? new Date(filters.dataFim) : undefined,
    },
    dataPagamento: {
      gte: filters?.dataPagamentoInicio ? new Date(filters.dataPagamentoInicio) : undefined,
      lte: filters?.dataPagamentoFim ? new Date(filters.dataPagamentoFim) : undefined,
    },
  };

  const [transactions, totalCount] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      include: { work: true, categoria: true },
      orderBy: { dataVencimento: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  const items = transactions.map((t) => ({ ...t, effectiveStatus: t.status as TransactionStatus }));

  return { items, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page };
}

export async function listFinancialCategories() {
  return prisma.financialCategory.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}

export async function listAllFinancialCategories() {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);
  return prisma.financialCategory.findMany({ orderBy: { nome: "asc" } });
}

export async function createFinancialCategory(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) {
    return "Informe o nome da categoria.";
  }

  const existing = await prisma.financialCategory.findUnique({ where: { nome } });
  if (existing) {
    return "Já existe uma categoria com esse nome.";
  }

  await prisma.financialCategory.create({ data: { nome } });
  revalidatePath("/configuracoes/categorias");
  return undefined;
}

export async function toggleFinancialCategoryActive(categoryId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  await prisma.financialCategory.update({ where: { id: categoryId }, data: { ativo } });
  revalidatePath("/configuracoes/categorias");
}

export async function getTransaction(transactionId: string) {
  return prisma.financialTransaction.findUnique({ where: { id: transactionId } });
}

export async function listUpcomingBills(workId: string, days = 7) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setUTCDate(limite.getUTCDate() + days);

  return prisma.financialTransaction.findMany({
    where: { workId, status: "PENDENTE", dataVencimento: { gte: hoje, lte: limite } },
    orderBy: { dataVencimento: "asc" },
  });
}

export async function getWorkFinancialSummary(workId: string) {
  const work = await prisma.work.findUnique({ where: { id: workId } });
  if (!work) return null;

  const [gastoAgg, recebidoAgg] = await Promise.all([
    prisma.financialTransaction.aggregate({ where: { workId, tipo: "PAGAR" }, _sum: { valor: true } }),
    prisma.financialTransaction.aggregate({
      where: { workId, tipo: "RECEBER", status: "PAGO" },
      _sum: { valor: true },
    }),
  ]);

  const contrato = Number(work.valorContrato);
  const gasto = Number(gastoAgg._sum.valor ?? 0);
  const recebido = Number(recebidoAgg._sum.valor ?? 0);
  const saldo = contrato - gasto;

  return { contrato, gasto, recebido, saldo };
}

export async function createTransaction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "FINANCEIRO"]);

  const parsed = parseTransactionForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const { supplierId, clientId } = await resolveFavorecidoIds(data.tipo, data.favorecidoNome);

  if (data.parcelar && data.numeroParcelas && data.numeroParcelas >= 2) {
    const n = data.numeroParcelas;
    const baseValor = Math.floor((data.valor / n) * 100) / 100;
    const remainder = Math.round((data.valor - baseValor * n) * 100) / 100;
    const grupoId = randomUUID();
    const baseVencimento = new Date(data.dataVencimento);

    await prisma.$transaction(
      Array.from({ length: n }, (_, i) =>
        prisma.financialTransaction.create({
          data: {
            workId: data.workId,
            tipo: data.tipo,
            descricao: `${data.descricao} (parcela ${i + 1}/${n})`,
            categoriaId: data.categoriaId,
            favorecidoNome: data.favorecidoNome,
            supplierId,
            clientId,
            bankAccountId: data.bankAccountId || null,
            stageId: data.stageId || null,
            taskId: data.taskId || null,
            valor: i === n - 1 ? baseValor + remainder : baseValor,
            dataEmissao: new Date(data.dataEmissao),
            dataVencimento: addMonths(baseVencimento, i),
            dataPagamento: null,
            formaPagamento: data.formaPagamento,
            status: "PENDENTE",
            observacao: data.observacao || null,
            parcelaGrupoId: grupoId,
            parcelaNumero: i + 1,
            parcelaTotal: n,
            createdById: session.user.id,
          },
        }),
      ),
    );
  } else {
    await prisma.financialTransaction.create({
      data: {
        workId: data.workId,
        tipo: data.tipo,
        descricao: data.descricao,
        categoriaId: data.categoriaId,
        favorecidoNome: data.favorecidoNome,
        supplierId,
        clientId,
        bankAccountId: data.bankAccountId || null,
        stageId: data.stageId || null,
        taskId: data.taskId || null,
        valor: data.valor,
        dataEmissao: new Date(data.dataEmissao),
        dataVencimento: new Date(data.dataVencimento),
        dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
        formaPagamento: data.formaPagamento,
        status: data.status,
        observacao: data.observacao || null,
        createdById: session.user.id,
      },
    });
  }

  revalidatePath("/financeiro");
  revalidatePath(`/obras/${data.workId}/financeiro`);
  redirect("/financeiro");
}

export async function updateTransaction(
  transactionId: string,
  _prevState: string | undefined,
  formData: FormData,
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "FINANCEIRO"]);

  const parsed = parseTransactionForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const { supplierId, clientId } = await resolveFavorecidoIds(data.tipo, data.favorecidoNome);

  await prisma.financialTransaction.update({
    where: { id: transactionId },
    data: {
      workId: data.workId,
      tipo: data.tipo,
      descricao: data.descricao,
      categoriaId: data.categoriaId,
      favorecidoNome: data.favorecidoNome,
      supplierId,
      clientId,
      bankAccountId: data.bankAccountId || null,
      stageId: data.stageId || null,
      taskId: data.taskId || null,
      valor: data.valor,
      dataEmissao: new Date(data.dataEmissao),
      dataVencimento: new Date(data.dataVencimento),
      dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
      formaPagamento: data.formaPagamento,
      status: data.status,
      observacao: data.observacao || null,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath(`/obras/${data.workId}/financeiro`);
  redirect("/financeiro");
}

export async function markAsPago(transactionId: string, workId: string | null, formaPagamento?: PaymentMethod) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "FINANCEIRO"]);

  await prisma.financialTransaction.update({
    where: { id: transactionId },
    data: {
      status: "PAGO",
      dataPagamento: new Date(),
      formaPagamento,
    },
  });

  revalidatePath("/financeiro");
  if (workId) {
    revalidatePath(`/obras/${workId}/financeiro`);
  }
}

export async function deleteTransaction(transactionId: string, workId: string | null) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "FINANCEIRO"]);

  const transaction = await prisma.financialTransaction.findUnique({ where: { id: transactionId } });
  if (transaction?.invoiceId) {
    throw new Error("Esta conta está vinculada a uma nota fiscal. Remova o vínculo antes de excluir.");
  }

  await prisma.financialTransaction.delete({ where: { id: transactionId } });

  revalidatePath("/financeiro");
  if (workId) {
    revalidatePath(`/obras/${workId}/financeiro`);
  }
}
