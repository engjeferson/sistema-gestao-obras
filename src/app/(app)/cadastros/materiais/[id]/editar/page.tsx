import { notFound } from "next/navigation";
import { MaterialForm } from "@/components/cadastros/material-form";
import { MaterialPriceHistory } from "@/components/cadastros/material-price-history";
import { getMaterial, getMaterialPriceHistory, updateMaterial } from "@/server/actions/materiais";
import { listActiveUnits } from "@/server/actions/unidades";

export default async function EditarMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [material, units, priceHistory] = await Promise.all([
    getMaterial(id),
    listActiveUnits(),
    getMaterialPriceHistory(id),
  ]);
  if (!material) {
    notFound();
  }

  const updateMaterialWithId = updateMaterial.bind(null, material.id);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Editar material</h2>
        <MaterialForm action={updateMaterialWithId} defaultValues={material} submitLabel="Salvar alterações" units={units} />
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold">Histórico de preços</h3>
          <p className="text-sm text-muted-foreground">
            Preço unitário de cada nota fiscal lançada com este material — o preço acima é atualizado
            automaticamente com o valor da compra mais recente.
          </p>
        </div>
        <MaterialPriceHistory items={priceHistory} />
      </div>
    </div>
  );
}
