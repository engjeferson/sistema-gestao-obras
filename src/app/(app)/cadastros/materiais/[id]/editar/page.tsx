import { notFound } from "next/navigation";
import { MaterialForm } from "@/components/cadastros/material-form";
import { getMaterial, updateMaterial } from "@/server/actions/materiais";
import { listActiveUnits } from "@/server/actions/unidades";

export default async function EditarMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [material, units] = await Promise.all([getMaterial(id), listActiveUnits()]);
  if (!material) {
    notFound();
  }

  const updateMaterialWithId = updateMaterial.bind(null, material.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar material</h2>
      <MaterialForm action={updateMaterialWithId} defaultValues={material} submitLabel="Salvar alterações" units={units} />
    </div>
  );
}
