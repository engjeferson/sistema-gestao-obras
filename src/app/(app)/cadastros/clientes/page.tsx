import Link from "next/link";
import { Plus } from "lucide-react";
import { listClients } from "@/server/actions/clientes";
import { getCurrentModulePermissions } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { ClientsSearchList } from "@/components/cadastros/clients-search-list";

export default async function ClientesPage() {
  const [clients, modulePermissions] = await Promise.all([listClients(), getCurrentModulePermissions()]);

  return (
    <div className="flex flex-col gap-4">
      {!modulePermissions.cadastrosSomenteLeitura ? (
        <div className="flex items-center justify-end">
          <Button size="sm" render={<Link href="/cadastros/clientes/novo" />} nativeButton={false}>
            <Plus /> Novo cliente
          </Button>
        </div>
      ) : null}
      <ClientsSearchList clients={clients} />
    </div>
  );
}
