import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories, createTransaction } from "@/server/actions/financeiro";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";
import { TransactionForm } from "@/components/financeiro/transaction-form";

export default async function NovoLancamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ workId?: string }>;
}) {
  const { workId } = await searchParams;
  const [works, categorias, bankAccounts, stagesByWork, suppliers, clients] = await Promise.all([
    listWorks(),
    listFinancialCategories(),
    listActiveBankAccounts(),
    listStagesForAllWorks(),
    listSuppliers(),
    listClients(),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const bankAccountsOptions = bankAccounts.map((account) => ({
    id: account.id,
    nome: account.nome,
    tipo: account.tipo,
    diaFechamento: account.diaFechamento,
    diaVencimento: account.diaVencimento,
  }));
  const favorecidosOptions = [...new Set([...suppliers.map((s) => s.nome), ...clients.map((c) => c.nome)])];

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo lançamento financeiro</h1>
      </div>
      <TransactionForm
        action={createTransaction}
        works={worksOptions}
        categorias={categorias}
        bankAccounts={bankAccountsOptions}
        stagesByWork={stagesByWork}
        favorecidosOptions={favorecidosOptions}
        defaultWorkId={workId}
        submitLabel="Criar lançamento"
        allowParcelamento
      />
    </div>
  );
}
