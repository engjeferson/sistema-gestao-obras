import { listActiveMaterials } from "@/server/actions/materiais";
import { listWorks } from "@/server/actions/obras";
import { StockEntradaForm } from "@/components/estoque/stock-entrada-form";

export default async function NovaEntradaPage({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const { local } = await searchParams;
  const [materials, works] = await Promise.all([listActiveMaterials(), listWorks()]);
  const materialsOptions = materials.map((m) => ({ id: m.id, nome: m.nome }));
  const worksOptions = works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }));

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova entrada de estoque</h1>
      </div>
      <StockEntradaForm materials={materialsOptions} works={worksOptions} defaultWorkId={local} />
    </div>
  );
}
