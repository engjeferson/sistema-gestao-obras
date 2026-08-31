import Link from "next/link";
import { Plus } from "lucide-react";
import { listProfessionals } from "@/server/actions/profissionais";
import { getCurrentModulePermissions } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { ProfessionalsSearchList } from "@/components/cadastros/professionals-search-list";

export default async function ProfissionaisPage() {
  const [professionals, modulePermissions] = await Promise.all([
    listProfessionals(),
    getCurrentModulePermissions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {!modulePermissions.cadastrosSomenteLeitura ? (
        <div className="flex items-center justify-end">
          <Button size="sm" render={<Link href="/cadastros/profissionais/novo" />} nativeButton={false}>
            <Plus /> Novo profissional
          </Button>
        </div>
      ) : null}
      <ProfessionalsSearchList professionals={professionals} />
    </div>
  );
}
