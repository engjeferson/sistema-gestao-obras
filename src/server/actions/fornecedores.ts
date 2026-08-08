"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { supplierFormSchema } from "@/lib/validations/fornecedores";

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { nome: "asc" } });
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

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.supplier.create({
    data: {
      nome: data.nome,
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

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      nome: data.nome,
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

  await prisma.supplier.update({ where: { id: supplierId }, data: { ativo } });
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
