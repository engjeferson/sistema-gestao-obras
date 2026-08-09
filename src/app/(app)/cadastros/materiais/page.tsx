import Link from "next/link";
import { Plus } from "lucide-react";
import { listMaterials } from "@/server/actions/materiais";
import { Button } from "@/components/ui/button";
import { MaterialsSearchList } from "@/components/cadastros/materials-search-list";

export default async function MateriaisPage() {
  const materials = await listMaterials();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button size="sm" render={<Link href="/cadastros/materiais/novo" />} nativeButton={false}>
          <Plus /> Novo material
        </Button>
      </div>
      <MaterialsSearchList materials={materials} />
    </div>
  );
}
