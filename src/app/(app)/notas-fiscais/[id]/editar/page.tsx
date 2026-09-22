import { notFound } from "next/navigation";
import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listActiveMaterials } from "@/server/actions/materiais";
import { listActiveUnits } from "@/server/actions/unidades";
import { getInvoice, getInvoiceEditability, updateInvoice } from "@/server/actions/notas-fiscais";
import { InvoiceForm } from "@/components/notas-fiscais/invoice-form";

export default async function EditarNotaFiscalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, editability] = await Promise.all([getInvoice(id), getInvoiceEditability(id)]);
  if (!invoice) {
    notFound();
  }

  if (!editability.editable) {
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Editar nota fiscal</h1>
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          {editability.reason}
        </p>
      </div>
    );
  }

  const [works, categorias, bankAccounts, stagesByWork, suppliers, materials, units] = await Promise.all([
    listWorks(),
    listFinancialCategories(),
    listActiveBankAccounts(),
    listStagesForAllWorks(),
    listSuppliers(),
    listActiveMaterials(),
    listActiveUnits(),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const bankAccountsOptions = bankAccounts.map((account) => ({ id: account.id, nome: account.nome }));
  const supplierNames = suppliers.map((s) => s.nome);
  const materialsOptions = materials.map((m) => ({
    nome: m.nome,
    unidadePadrao: m.unidadePadrao,
    precoUnitario: m.precoUnitario !== null ? Number(m.precoUnitario) : null,
  }));

  const transaction = invoice.financialTransactions[0] ?? null;
  const updateInvoiceWithId = updateInvoice.bind(null, invoice.id);

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar nota fiscal</h1>
      </div>
      <InvoiceForm
        action={updateInvoiceWithId}
        works={worksOptions}
        categorias={categorias}
        bankAccounts={bankAccountsOptions}
        stagesByWork={stagesByWork}
        supplierNames={supplierNames}
        materials={materialsOptions}
        units={units}
        submitLabel="Salvar alterações"
        defaultValues={{
          workId: invoice.workId,
          supplierNome: invoice.supplier.nome,
          nome: invoice.nome,
          stageId: invoice.stageId,
          taskId: invoice.taskId,
          numero: invoice.numero,
          dataEmissao: invoice.dataEmissao.toISOString().slice(0, 10),
          categoriaId: invoice.categoriaId,
          observacao: invoice.observacao,
          items: invoice.items.map((item) => ({
            material: item.material,
            quantidade: Number(item.quantidade),
            unidade: item.unidade,
            valorUnitario: Number(item.valorUnitario),
          })),
          valorDesconto: Number(invoice.valorDesconto),
          valorFrete: Number(invoice.valorFrete),
          arquivoUrl: invoice.arquivoUrl,
          arquivoXmlUrl: invoice.arquivoXmlUrl,
          gerarContaPagar: Boolean(transaction),
          contaPaga: transaction?.status === "PAGO",
          dataVencimento: transaction ? transaction.dataVencimento.toISOString().slice(0, 10) : null,
          bankAccountId: transaction?.bankAccountId ?? null,
          comprovanteUrl: transaction?.comprovanteUrl ?? null,
        }}
      />
    </div>
  );
}
