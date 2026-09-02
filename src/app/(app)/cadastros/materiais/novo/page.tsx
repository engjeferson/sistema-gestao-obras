import { MaterialForm } from "@/components/cadastros/material-form";
import { createMaterial } from "@/server/actions/materiais";
import { listActiveUnits } from "@/server/actions/unidades";

export default async function NovoMaterialPage() {
  const units = await listActiveUnits();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Novo material</h2>
      <MaterialForm action={createMaterial} submitLabel="Criar material" units={units} />
    </div>
  );
}
