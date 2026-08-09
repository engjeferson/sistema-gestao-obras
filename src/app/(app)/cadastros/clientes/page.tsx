import Link from "next/link";
import { Plus } from "lucide-react";
import { listClients } from "@/server/actions/clientes";
import { Button } from "@/components/ui/button";
import { ClientsSearchList } from "@/components/cadastros/clients-search-list";

export default async function ClientesPage() {
  const clients = await listClients();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button size="sm" render={<Link href="/cadastros/clientes/novo" />} nativeButton={false}>
          <Plus /> Novo cliente
        </Button>
      </div>
      <ClientsSearchList clients={clients} />
    </div>
  );
}
