import { listActiveMaterials } from "@/server/actions/materiais";
import { listWorks } from "@/server/actions/obras";
import { getStockBalancesAllLocations } from "@/server/actions/estoque";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { StockSaidaForm } from "@/components/estoque/stock-saida-form";

export default async function NovaSaidaPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const { local } = await searchParams;
  const [materials, works, stagesByWork] = await Promise.all([
    listActiveMaterials(),
    listWorks(),
    listStagesForAllWorks(),
  ]);
  const materialsOptions = materials.map((m) => ({ id: m.id, nome: m.nome }));
  const worksOptions = works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }));
  const balances = await getStockBalancesAllLocations(works.map((w) => w.id));

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova saída de estoque</h1>
      </div>
      <StockSaidaForm
        materials={materialsOptions}
        works={worksOptions}
        balances={balances}
        stagesByWork={stagesByWork}
        defaultWorkId={local}
      />
    </div>
  );
}
