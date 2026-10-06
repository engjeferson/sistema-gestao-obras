import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";
import { createPreLancamento } from "@/server/actions/pre-lancamentos";
import { PreLancamentoForm } from "@/components/financeiro/pre-lancamento-form";

export default async function NovoPreLancamentoPage() {
  const [works, categorias, stagesByWork, suppliers, clients] = await Promise.all([
    listWorks(),
    listFinancialCategories(),
    listStagesForAllWorks(),
    listSuppliers(),
    listClients(),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const favorecidosOptions = [...new Set([...suppliers.map((s) => s.nome), ...clients.map((c) => c.nome)])];

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo pré-lançamento</h1>
        <p className="text-muted-foreground">
          Fica pendente de revisão — só vira conta de verdade no Financeiro quando você aprovar.
        </p>
      </div>
      <PreLancamentoForm
        action={createPreLancamento}
        works={worksOptions}
        categorias={categorias}
        stagesByWork={stagesByWork}
        favorecidosOptions={favorecidosOptions}
        submitLabel="Criar pré-lançamento"
        origem="MANUAL"
      />
    </div>
  );
}
