import Link from "next/link";
import { Plus } from "lucide-react";
import { getObrasDashboard } from "@/server/actions/obras";
import { listClients } from "@/server/actions/clientes";
import { Button } from "@/components/ui/button";
import { ObrasDashboard } from "@/components/obras/obras-dashboard";

export default async function ObrasPage() {
  const [dashboard, clients] = await Promise.all([getObrasDashboard(), listClients()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Obras</h1>
          <p className="text-muted-foreground">Acompanhe o andamento e a saúde financeira de todas as obras.</p>
        </div>
        <Button render={<Link href="/obras/novo" />} nativeButton={false}>
          <Plus /> Nova obra
        </Button>
      </div>

      <ObrasDashboard
        works={dashboard.works}
        totalCount={dashboard.totalCount}
        kpis={dashboard.kpis}
        clients={clients}
      />
    </div>
  );
}
