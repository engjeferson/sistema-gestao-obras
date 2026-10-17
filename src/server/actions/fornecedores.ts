"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { assertModuleWrite } from "@/server/actions/permissions";
import { supplierFormSchema } from "@/lib/validations/fornecedores";

export async function listSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { invoices: true, financialTransactions: true, contracts: true } } },
  });
  return suppliers.map(({ _count, ...supplier }) => ({
    ...supplier,
    usado: _count.invoices > 0 || _count.financialTransactions > 0 || _count.contracts > 0,
  }));
}

export async function getSupplier(supplierId: string) {
  return prisma.supplier.findUnique({ where: { id: supplierId } });
}

function parseSupplierForm(formData: FormData) {
  return supplierFormSchema.safeParse({
    nome: formData.get("nome"),
    nomeFantasia: formData.get("nomeFantasia") ?? undefined,
    documento: formData.get("documento") ?? undefined,
    telefone: formData.get("telefone") ?? undefined,
    whatsapp: formData.get("whatsapp") ?? undefined,
    email: formData.get("email") ?? undefined,
    endereco: formData.get("endereco") ?? undefined,
    categoria: formData.get("categoria") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
  });
}

export async function createSupplier(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const nome = data.nome.toUpperCase();

  const existing = await prisma.supplier.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } } });
  if (existing) {
    return "Já existe um fornecedor com esse nome.";
  }

  await prisma.supplier.create({
    data: {
      nome,
      nomeFantasia: data.nomeFantasia || null,
      documento: data.documento || null,
      telefone: data.telefone || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      endereco: data.endereco || null,
      categoria: data.categoria,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/fornecedores");
  redirect("/cadastros/fornecedores");
}

export async function updateSupplier(supplierId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const nome = data.nome.toUpperCase();

  const existing = await prisma.supplier.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" }, id: { not: supplierId } },
  });
  if (existing) {
    return "Já existe um fornecedor com esse nome.";
  }

  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      nome,
      nomeFantasia: data.nomeFantasia || null,
      documento: data.documento || null,
      telefone: data.telefone || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      endereco: data.endereco || null,
      categoria: data.categoria,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/fornecedores");
  redirect("/cadastros/fornecedores");
}

export async function toggleSupplierActive(supplierId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  await prisma.supplier.update({ where: { id: supplierId }, data: { ativo } });
  revalidatePath("/cadastros/fornecedores");
}

// Só pode ser excluído fornecedor que nunca entrou em nenhuma NF, lançamento financeiro ou
// contrato — se já foi usado em algum lugar, só desativar. Serve pra limpar duplicatas (ex: um
// fornecedor cadastrado duas vezes com maiúsculas diferentes) depois de reatribuir os lançamentos.
export async function deleteSupplier(supplierId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  const [invoicesCount, transactionsCount, contractsCount] = await Promise.all([
    prisma.invoice.count({ where: { supplierId } }),
    prisma.financialTransaction.count({ where: { supplierId } }),
    prisma.contract.count({ where: { contratadoSupplierId: supplierId } }),
  ]);
  if (invoicesCount > 0 || transactionsCount > 0 || contractsCount > 0) {
    throw new Error("Este fornecedor já foi utilizado e não pode ser excluído. Desative-o em vez disso.");
  }

  await prisma.supplier.delete({ where: { id: supplierId } });
  revalidatePath("/cadastros/fornecedores");
}

export async function getSupplierDetail(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) return null;

  const [compradoAgg, pagoAgg, aPagarAgg, ultimasCompras, transacoes, invoiceWorkIds, transactionWorkIds] =
    await Promise.all([
      prisma.invoice.aggregate({ where: { supplierId }, _sum: { valorTotal: true } }),
      prisma.financialTransaction.aggregate({
        where: { supplierId, status: "PAGO" },
        _sum: { valor: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { supplierId, status: { in: ["PENDENTE", "VENCIDO"] } },
        _sum: { valor: true },
      }),
      prisma.invoice.findMany({
        where: { supplierId },
        orderBy: { dataEmissao: "desc" },
        take: 10,
        include: { work: true },
      }),
      prisma.financialTransaction.findMany({
        where: { supplierId },
        orderBy: { dataVencimento: "desc" },
        take: 20,
        include: { work: true, categoria: true },
      }),
      prisma.invoice.findMany({ where: { supplierId }, select: { workId: true }, distinct: ["workId"] }),
      prisma.financialTransaction.findMany({
        where: { supplierId },
        select: { workId: true },
        distinct: ["workId"],
      }),
    ]);

  const workIds = [
    ...new Set(
      [...invoiceWorkIds.map((i) => i.workId), ...transactionWorkIds.map((t) => t.workId)].filter(
        (id): id is string => id !== null,
      ),
    ),
  ];
  const obrasAtendidas = await prisma.work.findMany({ where: { id: { in: workIds } }, select: { id: true, nome: true, codigo: true } });

  return {
    supplier,
    totalComprado: Number(compradoAgg._sum.valorTotal ?? 0),
    totalPago: Number(pagoAgg._sum.valor ?? 0),
    totalAPagar: Number(aPagarAgg._sum.valor ?? 0),
    ultimasCompras: ultimasCompras.map((i) => ({
      id: i.id,
      numero: i.numero,
      dataEmissao: i.dataEmissao,
      valorTotal: Number(i.valorTotal),
      workNome: i.work?.nome ?? "Estoque Geral",
    })),
    historicoFinanceiro: transacoes.map((t) => ({
      id: t.id,
      descricao: t.descricao,
      valor: Number(t.valor),
      status: t.status,
      dataVencimento: t.dataVencimento,
      workNome: t.work?.nome ?? "Despesa geral",
      categoriaNome: t.categoria.nome,
    })),
    obrasAtendidas,
  };
}
