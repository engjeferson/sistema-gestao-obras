import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";
import { listActiveMaterials } from "@/server/actions/materiais";
import { listActiveUnits } from "@/server/actions/unidades";
import { PreLancamentoIaFlow } from "@/components/financeiro/pre-lancamento-ia-flow";

export default async function NovoPreLancamentoIaPage() {
  const [works, categorias, stagesByWork, suppliers, clients, materials, units] = await Promise.all([
    listWorks(),
    listFinancialCategories(),
    listStagesForAllWorks(),
    listSuppliers(),
    listClients(),
    listActiveMaterials(),
    listActiveUnits(),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const favorecidosOptions = [...new Set([...suppliers.map((s) => s.nome), ...clients.map((c) => c.nome)])];
  const materialsOptions = materials.map((m) => ({
    nome: m.nome,
    unidadePadrao: m.unidadePadrao,
    precoUnitario: m.precoUnitario !== null ? Number(m.precoUnitario) : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pré-lançamento via IA</h1>
        <p className="text-muted-foreground">
          Cole o texto de uma conversa ou anexe a foto de um comprovante — a IA extrai os dados pra você revisar.
        </p>
      </div>
      <PreLancamentoIaFlow
        works={worksOptions}
        categorias={categorias}
        stagesByWork={stagesByWork}
        favorecidosOptions={favorecidosOptions}
        materials={materialsOptions}
        units={units}
      />
    </div>
  );
}
