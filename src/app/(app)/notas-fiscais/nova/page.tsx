import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listActiveMaterials } from "@/server/actions/materiais";
import { createInvoice } from "@/server/actions/notas-fiscais";
import { InvoiceForm } from "@/components/notas-fiscais/invoice-form";

export default async function NovaNotaFiscalPage({
  searchParams,
}: {
  searchParams: Promise<{ workId?: string }>;
}) {
  const { workId } = await searchParams;
  const [works, categorias, bankAccounts, stagesByWork, suppliers, materials] = await Promise.all([
    listWorks(),
    listFinancialCategories(),
    listActiveBankAccounts(),
    listStagesForAllWorks(),
    listSuppliers(),
    listActiveMaterials(),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const bankAccountsOptions = bankAccounts.map((account) => ({ id: account.id, nome: account.nome }));
  const supplierNames = suppliers.map((s) => s.nome);
  const materialsOptions = materials.map((m) => ({ nome: m.nome, unidadePadrao: m.unidadePadrao }));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova nota fiscal</h1>
      </div>
      <InvoiceForm
        action={createInvoice}
        works={worksOptions}
        categorias={categorias}
        bankAccounts={bankAccountsOptions}
        stagesByWork={stagesByWork}
        supplierNames={supplierNames}
        materials={materialsOptions}
        defaultWorkId={workId}
      />
    </div>
  );
}
