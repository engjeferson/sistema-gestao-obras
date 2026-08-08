import Link from "next/link";
import { Plus } from "lucide-react";
import { listMaterials } from "@/server/actions/materiais";
import { Button } from "@/components/ui/button";
import { MaterialsTable } from "@/components/cadastros/materials-table";

export default async function MateriaisPage() {
  const materials = await listMaterials();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button size="sm" render={<Link href="/cadastros/materiais/novo" />} nativeButton={false}>
          <Plus /> Novo material
        </Button>
      </div>
      <MaterialsTable materials={materials} />
    </div>
  );
}
