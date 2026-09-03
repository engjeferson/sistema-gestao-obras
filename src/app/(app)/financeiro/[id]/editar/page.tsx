import { notFound } from "next/navigation";
import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories, getTransaction, updateTransaction } from "@/server/actions/financeiro";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";
import { TransactionForm } from "@/components/financeiro/transaction-form";

export default async function EditarLancamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [transaction, works, categorias, bankAccounts, stagesByWork, suppliers, clients] = await Promise.all([
    getTransaction(id),
    listWorks(),
    listFinancialCategories(),
    listActiveBankAccounts(),
    listStagesForAllWorks(),
    listSuppliers(),
    listClients(),
  ]);

  if (!transaction) {
    notFound();
  }

  const updateTransactionWithId = updateTransaction.bind(null, transaction.id);
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
        <h1 className="text-2xl font-semibold tracking-tight">Editar lançamento</h1>
      </div>
      <TransactionForm
        action={updateTransactionWithId}
        works={worksOptions}
        categorias={categorias}
        bankAccounts={bankAccountsOptions}
        stagesByWork={stagesByWork}
        favorecidosOptions={favorecidosOptions}
        defaultValues={{ ...transaction, valor: Number(transaction.valor) }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
