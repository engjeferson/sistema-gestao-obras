import { MaterialForm } from "@/components/cadastros/material-form";
import { createMaterial } from "@/server/actions/materiais";

export default function NovoMaterialPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Novo material</h2>
      <MaterialForm action={createMaterial} submitLabel="Criar material" />
    </div>
  );
}
