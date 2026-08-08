import { listActiveMaterials } from "@/server/actions/materiais";
import { listWorks } from "@/server/actions/obras";
import { getStockBalancesAllLocations } from "@/server/actions/estoque";
import { StockTransferenciaForm } from "@/components/estoque/stock-transferencia-form";

export default async function NovaTransferenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const { local } = await searchParams;
  const [materials, works] = await Promise.all([listActiveMaterials(), listWorks()]);
  const materialsOptions = materials.map((m) => ({ id: m.id, nome: m.nome }));
  const worksOptions = works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }));
  const balances = await getStockBalancesAllLocations(works.map((w) => w.id));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova transferência de estoque</h1>
      </div>
      <StockTransferenciaForm
        materials={materialsOptions}
        works={worksOptions}
        balances={balances}
        defaultOrigemWorkId={local}
      />
    </div>
  );
}
