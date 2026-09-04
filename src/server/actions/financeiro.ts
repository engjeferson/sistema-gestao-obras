"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { randomUUID } from "crypto";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole, ForbiddenError } from "@/lib/permissions";
import { transactionFormSchema } from "@/lib/validations/financeiro";
import { getCurrentWorkAccess, getCurrentModulePermissions } from "@/server/actions/permissions";
import { getMaterialCostBreakdown } from "@/server/actions/estoque";
import { calcularVencimentoFatura } from "@/lib/fatura-cartao";
import type { PaymentMethod, Role, TransactionStatus, TransactionType } from "@/generated/prisma/enums";

const FINANCEIRO_EDIT_ROLES: Role[] = ["ADMINISTRADOR", "FINANCEIRO", "ENGENHEIRO"];

/**
 * Administrador e Financeiro sempre podem lançar/editar. Engenheiro também
 * pode, a menos que um admin tenha marcado "Financeiro" como só leitura para
 * ele em Configurações > Usuários.
 */
async function assertCanEditFinanceiro(session: Session) {
  if (session.user.role !== "ENGENHEIRO") return;
  const modulePerms = await getCurrentModulePermissions();
  if (modulePerms.financeiroSomenteLeitura) {
    throw new ForbiddenError("Você só tem acesso de visualização ao Financeiro.");
  }
}

async function calcularVencimentoCartao(
  formaPagamento: PaymentMethod | undefined,
  bankAccountId: string | undefined,
  dataCompra: Date,
): Promise<Date | null> {
  if (formaPagamento !== "CARTAO" || !bankAccountId) return null;

  const conta = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    select: { tipo: true, diaFechamento: true, diaVencimento: true },
  });
  if (!conta || conta.tipo !== "CARTAO_CREDITO" || !conta.diaFechamento || !conta.diaVencimento) {
    return null;
  }

  return calcularVencimentoFatura(dataCompra, conta.diaFechamento, conta.diaVencimento);
}

export type TransactionFilters = {
  workId?: string;
  tipo?: TransactionType;
  categoriaId?: string;
  categoriaIdIn?: string[];
  status?: TransactionStatus | "EM_ABERTO";
  favorecido?: string;
  supplierId?: string;
  bankAccountId?: string;
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

async function buildTransactionWhere(filters?: TransactionFilters) {
  const workAccess = await getCurrentWorkAccess();
  return {
    workId: filters?.workId ?? (workAccess !== null ? { in: workAccess } : undefined),
    tipo: filters?.tipo,
    categoriaId: filters?.categoriaIdIn ? { in: filters.categoriaIdIn } : filters?.categoriaId,
    status:
      filters?.status === "EM_ABERTO"
        ? { in: ["PENDENTE", "VENCIDO"] as TransactionStatus[] }
        : filters?.status,
    supplierId: filters?.supplierId,
    bankAccountId: filters?.bankAccountId,
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
}

async function healOverdueTransactions(filters?: TransactionFilters) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  const overdue = await prisma.financialTransaction.findMany({
    where: {
      workId: filters?.workId,
      categoriaId: filters?.categoriaId,
      supplierId: filters?.supplierId,
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

  const where = await buildTransactionWhere(filters);

  const [transactions, totalCount] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      include: {
        work: true,
        categoria: true,
        invoice: {
          select: {
            items: { select: { material: true, quantidade: true, unidade: true, valorUnitario: true, valorTotal: true } },
          },
        },
      },
      orderBy: { dataVencimento: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  const items = transactions.map((t) => ({
    ...t,
    effectiveStatus: t.status as TransactionStatus,
    invoice: t.invoice
      ? {
          items: t.invoice.items.map((item) => ({
            material: item.material,
            quantidade: Number(item.quantidade),
            unidade: item.unidade,
            valorUnitario: Number(item.valorUnitario),
            valorTotal: Number(item.valorTotal),
          })),
        }
      : null,
  }));

  return { items, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page };
}

export async function getTransactionsSummary(filters?: TransactionFilters) {
  const baseFilters: TransactionFilters = { ...filters, status: undefined };
  await healOverdueTransactions(baseFilters);
  const where = await buildTransactionWhere(baseFilters);

  const [aPagar, pagas, pendentes] = await Promise.all([
    prisma.financialTransaction.aggregate({ where: { ...where, tipo: "PAGAR" }, _sum: { valor: true } }),
    prisma.financialTransaction.aggregate({ where: { ...where, status: "PAGO" }, _sum: { valor: true } }),
    prisma.financialTransaction.aggregate({
      where: { ...where, status: { in: ["PENDENTE", "VENCIDO"] } },
      _sum: { valor: true },
    }),
  ]);

  return {
    totalAPagar: Number(aPagar._sum.valor ?? 0),
    totalPagas: Number(pagas._sum.valor ?? 0),
    totalPendentes: Number(pendentes._sum.valor ?? 0),
  };
}

export async function batchMarkAsPago(transactionIds: string[], formaPagamento?: PaymentMethod) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);
  if (transactionIds.length === 0) return;

  const transactions = await prisma.financialTransaction.findMany({
    where: { id: { in: transactionIds } },
    select: { workId: true },
  });

  await prisma.financialTransaction.updateMany({
    where: { id: { in: transactionIds } },
    data: { status: "PAGO", dataPagamento: new Date(), formaPagamento },
  });

  revalidatePath("/financeiro");
  for (const workId of new Set(transactions.map((t) => t.workId).filter((id): id is string => !!id))) {
    revalidatePath(`/obras/${workId}/financeiro`);
  }
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

export async function updateFinancialCategory(categoryId: string, nome: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const trimmed = nome.trim();
  if (!trimmed) {
    throw new Error("Informe o nome da categoria.");
  }

  const existing = await prisma.financialCategory.findUnique({ where: { nome: trimmed } });
  if (existing && existing.id !== categoryId) {
    throw new Error("Já existe uma categoria com esse nome.");
  }

  await prisma.financialCategory.update({ where: { id: categoryId }, data: { nome: trimmed } });
  revalidatePath("/configuracoes/categorias");
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

  const materialCategoria = await prisma.financialCategory.findFirst({
    where: { nome: "Material" },
    select: { id: true },
  });

  const [gastoNaoMaterialAgg, recebidoAgg, materialCosts] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: {
        workId,
        tipo: "PAGAR",
        ...(materialCategoria ? { categoriaId: { not: materialCategoria.id } } : {}),
      },
      _sum: { valor: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { workId, tipo: "RECEBER", status: "PAGO" },
      _sum: { valor: true },
    }),
    getMaterialCostBreakdown([workId]),
  ]);

  const contrato = Number(work.valorContrato);
  // Igual custoTotal do dashboard: lançamentos não-material + material via estoque, pra
  // uma transferência de material entre obras entrar no gasto mesmo sem gerar conta nova.
  const gasto = Number(gastoNaoMaterialAgg._sum.valor ?? 0) + (materialCosts.totalByWork.get(workId) ?? 0);
  const recebido = Number(recebidoAgg._sum.valor ?? 0);
  const saldo = contrato - gasto;

  return { contrato, gasto, recebido, saldo };
}

export async function createTransaction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  const parsed = parseTransactionForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const { supplierId, clientId } = await resolveFavorecidoIds(data.tipo, data.favorecidoNome);
  const dataVencimentoCalculada = await calcularVencimentoCartao(
    data.formaPagamento,
    data.bankAccountId,
    new Date(data.dataEmissao),
  );

  if (data.parcelar && data.numeroParcelas && data.numeroParcelas >= 2) {
    const n = data.numeroParcelas;
    const baseValor = Math.floor((data.valor / n) * 100) / 100;
    const remainder = Math.round((data.valor - baseValor * n) * 100) / 100;
    const grupoId = randomUUID();
    const baseVencimento = dataVencimentoCalculada ?? new Date(data.dataVencimento);

    await prisma.$transaction(
      Array.from({ length: n }, (_, i) =>
        prisma.financialTransaction.create({
          data: {
            workId: data.workId || null,
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
        workId: data.workId || null,
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
        dataVencimento: dataVencimentoCalculada ?? new Date(data.dataVencimento),
        dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
        formaPagamento: data.formaPagamento,
        status: data.status,
        observacao: data.observacao || null,
        createdById: session.user.id,
      },
    });
  }

  revalidatePath("/financeiro");
  if (data.workId) {
    revalidatePath(`/obras/${data.workId}/financeiro`);
  }
  redirect("/financeiro");
}

export async function updateTransaction(
  transactionId: string,
  _prevState: string | undefined,
  formData: FormData,
) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  const parsed = parseTransactionForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const { supplierId, clientId } = await resolveFavorecidoIds(data.tipo, data.favorecidoNome);

  await prisma.financialTransaction.update({
    where: { id: transactionId },
    data: {
      workId: data.workId || null,
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
  if (data.workId) {
    revalidatePath(`/obras/${data.workId}/financeiro`);
  }
  redirect("/financeiro");
}

export async function markAsPago(transactionId: string, workId: string | null, formaPagamento?: PaymentMethod) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

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

export async function partialPayTransaction(
  transactionId: string,
  workId: string | null,
  input: {
    valorPago: number;
    formaPagamento?: PaymentMethod;
    dataPagamento: string;
    novoVencimento?: string;
    comprovanteUrl?: string;
  },
) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

  const original = await prisma.financialTransaction.findUnique({ where: { id: transactionId } });
  if (!original) {
    throw new Error("Lançamento não encontrado.");
  }
  if (original.status === "PAGO") {
    throw new Error("Esta conta já está paga.");
  }

  const valorTotal = Number(original.valor);
  if (!(input.valorPago > 0) || input.valorPago >= valorTotal) {
    throw new Error("O valor pago deve ser maior que zero e menor que o valor total da conta.");
  }
  const valorResidual = Math.round((valorTotal - input.valorPago) * 100) / 100;
  const grupoId = original.parcelaGrupoId ?? randomUUID();

  await prisma.$transaction([
    prisma.financialTransaction.update({
      where: { id: transactionId },
      data: {
        valor: input.valorPago,
        status: "PAGO",
        dataPagamento: new Date(input.dataPagamento),
        formaPagamento: input.formaPagamento,
        comprovanteUrl: input.comprovanteUrl || null,
        descricao: `${original.descricao} (parcela 1/2 — pago)`,
        parcelaGrupoId: grupoId,
        parcelaNumero: 1,
        parcelaTotal: 2,
      },
    }),
    prisma.financialTransaction.create({
      data: {
        workId: original.workId,
        tipo: original.tipo,
        descricao: `${original.descricao} (parcela 2/2 — saldo residual)`,
        categoriaId: original.categoriaId,
        favorecidoNome: original.favorecidoNome,
        supplierId: original.supplierId,
        clientId: original.clientId,
        bankAccountId: original.bankAccountId,
        stageId: original.stageId,
        taskId: original.taskId,
        valor: valorResidual,
        dataEmissao: original.dataEmissao,
        dataVencimento: input.novoVencimento ? new Date(input.novoVencimento) : original.dataVencimento,
        dataPagamento: null,
        formaPagamento: null,
        status: "PENDENTE",
        observacao: original.observacao,
        invoiceId: original.invoiceId,
        parcelaGrupoId: grupoId,
        parcelaNumero: 2,
        parcelaTotal: 2,
        createdById: session.user.id,
      },
    }),
  ]);

  revalidatePath("/financeiro");
  if (workId) {
    revalidatePath(`/obras/${workId}/financeiro`);
  }
  if (original.invoiceId) {
    revalidatePath(`/notas-fiscais/${original.invoiceId}`);
  }
}

export async function deleteTransaction(transactionId: string, workId: string | null) {
  const session = await auth();
  assertRole(session, FINANCEIRO_EDIT_ROLES);
  await assertCanEditFinanceiro(session);

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
