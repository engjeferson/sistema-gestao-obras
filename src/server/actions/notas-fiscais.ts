"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { invoiceFormSchema } from "@/lib/validations/notas-fiscais";
import { createInvoiceWithFinancialEntry } from "@/server/services/nf-financial";
import { markIncomingNFeLancada } from "@/server/actions/sefaz-radar";

const DEFAULT_PAGE_SIZE = 20;

export async function listInvoices(workId?: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const where = workId ? { workId } : {};
  const [items, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { work: true, supplier: true, categoria: true, items: true },
      orderBy: { dataEmissao: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), page, pageSize };
}

export async function getInvoice(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      work: true,
      supplier: true,
      categoria: true,
      items: true,
      financialTransactions: true,
      stage: { select: { id: true, codigo: true, nome: true } },
      task: { select: { id: true, codigo: true, nome: true } },
      incomingNFe: { select: { id: true } },
    },
  });
}

export async function createInvoice(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  let itemsParsed: unknown;
  try {
    itemsParsed = JSON.parse(String(formData.get("itemsJson") ?? "[]"));
  } catch {
    return "Itens inválidos.";
  }

  let parcelasParsed: unknown;
  try {
    parcelasParsed = JSON.parse(String(formData.get("parcelasJson") ?? "[]"));
  } catch {
    return "Parcelas inválidas.";
  }

  const temEntrada = formData.get("temEntrada") === "on";
  const entrada = temEntrada
    ? {
        valor: Number(formData.get("valorEntrada") ?? 0),
        dataVencimento: String(formData.get("dataEntrada") ?? ""),
        paga: formData.get("entradaPaga") === "on",
      }
    : undefined;

  const parsed = invoiceFormSchema.safeParse({
    workId: formData.get("workId"),
    supplierNome: formData.get("supplierNome"),
    nome: formData.get("nome") ?? undefined,
    stageId: formData.get("stageId") ?? undefined,
    taskId: formData.get("taskId") ?? undefined,
    numero: formData.get("numero"),
    dataEmissao: formData.get("dataEmissao"),
    categoriaId: formData.get("categoriaId"),
    observacao: formData.get("observacao") ?? undefined,
    items: itemsParsed,
    valorDesconto: formData.get("valorDesconto") || 0,
    valorFrete: formData.get("valorFrete") || 0,
    gerarContaPagar: formData.get("gerarContaPagar") === "on",
    contaPaga: formData.get("contaPaga") === "on",
    dataVencimento: formData.get("dataVencimento") || undefined,
    bankAccountId: formData.get("bankAccountId") || undefined,
    parcelar: formData.get("parcelar") === "on",
    temEntrada,
    entrada,
    parcelas: parcelasParsed,
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  if (data.gerarContaPagar && !data.parcelar && !data.dataVencimento) {
    return "Informe a data de vencimento para gerar a conta a pagar.";
  }

  if (data.gerarContaPagar && data.parcelar && data.parcelas) {
    const itemsSum = data.items.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0);
    const valorTotal = Math.max(0, itemsSum - data.valorDesconto + data.valorFrete);
    const somaEntrada = data.temEntrada && data.entrada ? data.entrada.valor : 0;
    const somaParcelas = somaEntrada + data.parcelas.reduce((sum, parcela) => sum + parcela.valor, 0);
    if (Math.abs(somaParcelas - valorTotal) > 0.01) {
      return `A soma da entrada + parcelas (${somaParcelas.toFixed(2)}) deve ser igual ao valor total da nota (${valorTotal.toFixed(2)}).`;
    }
  }

  const arquivoUrl = (formData.get("arquivoUrl") as string) || null;
  const arquivoXmlUrl = (formData.get("arquivoXmlUrl") as string) || null;
  const comprovanteUrl = (formData.get("comprovanteUrl") as string) || null;
  const radarId = (formData.get("radarId") as string) || null;

  const { invoice } = await createInvoiceWithFinancialEntry(
    data,
    session.user.id,
    arquivoUrl,
    arquivoXmlUrl,
    comprovanteUrl,
  );

  if (radarId) {
    await markIncomingNFeLancada(radarId, invoice.id);
  }

  revalidatePath("/notas-fiscais");
  revalidatePath("/estoque");
  if (data.workId) {
    revalidatePath(`/obras/${data.workId}/materiais`);
    revalidatePath(`/obras/${data.workId}/financeiro`);
    redirect(`/obras/${data.workId}/materiais`);
  }
  revalidatePath("/financeiro");
  redirect("/estoque");
}

export async function deleteInvoice(invoiceId: string, workId: string | null) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "FINANCEIRO"]);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { financialTransactions: true },
  });

  if (invoice?.financialTransactions.some((t) => t.status === "PAGO")) {
    throw new Error("A conta vinculada a esta nota já foi paga. Trate a conta manualmente antes de excluir.");
  }

  await prisma.$transaction(async (tx) => {
    if (invoice?.financialTransactions.length) {
      await tx.financialTransaction.deleteMany({ where: { invoiceId } });
    }
    await tx.invoice.delete({ where: { id: invoiceId } });
  });

  revalidatePath("/notas-fiscais");
  if (workId) {
    revalidatePath(`/obras/${workId}/materiais`);
    revalidatePath(`/obras/${workId}/financeiro`);
  } else {
    revalidatePath("/estoque");
    revalidatePath("/financeiro");
  }
}
