import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { InvoiceFormValues } from "@/lib/validations/notas-fiscais";

async function findOrCreateSupplierId(nome: string) {
  const trimmed = nome.trim();
  const existing = await prisma.supplier.findFirst({ where: { nome: trimmed } });
  if (existing) return existing.id;
  const created = await prisma.supplier.create({ data: { nome: trimmed } });
  return created.id;
}

async function findOrCreateMaterialId(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  nome: string,
  unidadePadrao: InvoiceFormValues["items"][number]["unidade"],
) {
  const trimmed = nome.trim();
  const existing = await tx.material.findUnique({ where: { nome: trimmed } });
  if (existing) return existing.id;
  const created = await tx.material.create({ data: { nome: trimmed, unidadePadrao } });
  return created.id;
}

export async function createInvoiceWithFinancialEntry(
  data: InvoiceFormValues,
  createdById: string,
  arquivoUrl: string | null,
  arquivoXmlUrl: string | null,
) {
  const supplierId = await findOrCreateSupplierId(data.supplierNome);
  const valorTotal = data.items.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0);
  const stageId = data.workId ? data.stageId || null : null;
  const taskId = data.workId ? data.taskId || null : null;

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        workId: data.workId,
        supplierId,
        stageId,
        taskId,
        nome: data.nome || null,
        numero: data.numero || "",
        dataEmissao: new Date(data.dataEmissao),
        valorTotal,
        categoriaId: data.categoriaId,
        arquivoUrl,
        arquivoXmlUrl,
        observacao: data.observacao || null,
      },
    });

    for (const item of data.items) {
      const materialId = await findOrCreateMaterialId(tx, item.material, item.unidade);
      const invoiceItem = await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          materialId,
          material: item.material,
          quantidade: item.quantidade,
          unidade: item.unidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.quantidade * item.valorUnitario,
        },
      });
      await tx.stockMovement.create({
        data: {
          materialId,
          tipo: "ENTRADA",
          destinoWorkId: data.workId,
          stageId,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          data: new Date(data.dataEmissao),
          motivo: `NF ${data.numero}`,
          invoiceItemId: invoiceItem.id,
          createdById,
        },
      });
    }

    if (!data.gerarContaPagar) {
      return { invoice, transactions: [] };
    }

    const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: supplierId } });

    if (data.parcelar && data.parcelas && data.parcelas.length > 0) {
      const temEntrada = Boolean(data.temEntrada && data.entrada);
      const totalPagamentos = data.parcelas.length + (temEntrada ? 1 : 0);
      const grupoId = randomUUID();
      const transactions: Awaited<ReturnType<typeof tx.financialTransaction.create>>[] = [];

      if (temEntrada && data.entrada) {
        const dataEntrada = new Date(data.entrada.dataVencimento);
        transactions.push(
          await tx.financialTransaction.create({
            data: {
              workId: data.workId,
              tipo: "PAGAR",
              descricao: `NF ${data.numero} — ${supplier.nome} (entrada)`,
              categoriaId: data.categoriaId,
              favorecidoNome: supplier.nome,
              supplierId,
              bankAccountId: data.bankAccountId || null,
              stageId,
              taskId,
              valor: data.entrada.valor,
              dataEmissao: new Date(data.dataEmissao),
              dataVencimento: dataEntrada,
              dataPagamento: data.entrada.paga ? dataEntrada : null,
              status: data.entrada.paga ? "PAGO" : "PENDENTE",
              invoiceId: invoice.id,
              parcelaGrupoId: grupoId,
              parcelaNumero: 1,
              parcelaTotal: totalPagamentos,
              createdById,
            },
          }),
        );
      }

      const offset = temEntrada ? 1 : 0;
      for (const [index, parcela] of data.parcelas.entries()) {
        transactions.push(
          await tx.financialTransaction.create({
            data: {
              workId: data.workId,
              tipo: "PAGAR",
              descricao: `NF ${data.numero} — ${supplier.nome} (parcela ${index + 1}/${data.parcelas.length})`,
              categoriaId: data.categoriaId,
              favorecidoNome: supplier.nome,
              supplierId,
              bankAccountId: data.bankAccountId || null,
              stageId,
              taskId,
              valor: parcela.valor,
              dataEmissao: new Date(data.dataEmissao),
              dataVencimento: new Date(parcela.dataVencimento),
              status: "PENDENTE",
              invoiceId: invoice.id,
              parcelaGrupoId: grupoId,
              parcelaNumero: offset + index + 1,
              parcelaTotal: totalPagamentos,
              createdById,
            },
          }),
        );
      }

      return { invoice, transactions };
    }

    if (!data.dataVencimento) {
      return { invoice, transactions: [] };
    }

    const transaction = await tx.financialTransaction.create({
      data: {
        workId: data.workId,
        tipo: "PAGAR",
        descricao: `NF ${data.numero} — ${supplier.nome}`,
        categoriaId: data.categoriaId,
        favorecidoNome: supplier.nome,
        supplierId,
        bankAccountId: data.bankAccountId || null,
        stageId,
        taskId,
        valor: valorTotal,
        dataEmissao: new Date(data.dataEmissao),
        dataVencimento: new Date(data.dataVencimento),
        status: "PENDENTE",
        invoiceId: invoice.id,
        createdById,
      },
    });
    return { invoice, transactions: [transaction] };
  });
}
