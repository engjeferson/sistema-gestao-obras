import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listActiveMaterials } from "@/server/actions/materiais";
import { createInvoice } from "@/server/actions/notas-fiscais";
import { getIncomingNFeXml } from "@/server/actions/sefaz-radar";
import { InvoiceForm } from "@/components/notas-fiscais/invoice-form";

export default async function NovaNotaFiscalPage({
  searchParams,
}: {
  searchParams: Promise<{ workId?: string; radarId?: string }>;
}) {
  const { workId, radarId } = await searchParams;
  const [works, categorias, bankAccounts, stagesByWork, suppliers, materials, radarXml] = await Promise.all([
    listWorks(),
    listFinancialCategories(),
    listActiveBankAccounts(),
    listStagesForAllWorks(),
    listSuppliers(),
    listActiveMaterials(),
    radarId ? getIncomingNFeXml(radarId) : Promise.resolve(null),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const bankAccountsOptions = bankAccounts.map((account) => ({ id: account.id, nome: account.nome }));
  const supplierNames = suppliers.map((s) => s.nome);
  const materialsOptions = materials.map((m) => ({ nome: m.nome, unidadePadrao: m.unidadePadrao }));
  const initialXml = radarXml && "xml" in radarXml ? radarXml.xml : undefined;
  const radarError = radarXml && "error" in radarXml ? radarXml.error : undefined;
  const initialSummary = radarXml && !initialXml ? (radarXml.resumo ?? undefined) : undefined;

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova Compra</h1>
      </div>
      {radarError ? <p className="text-sm text-destructive">{radarError}</p> : null}
      <InvoiceForm
        action={createInvoice}
        works={worksOptions}
        categorias={categorias}
        bankAccounts={bankAccountsOptions}
        stagesByWork={stagesByWork}
        supplierNames={supplierNames}
        materials={materialsOptions}
        defaultWorkId={workId}
        initialXml={initialXml}
        initialSummary={initialSummary}
        radarId={radarId}
      />
    </div>
  );
}
