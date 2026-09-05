import Link from "next/link";
import { Plus, Radar, Download } from "lucide-react";
import { listInvoices } from "@/server/actions/notas-fiscais";
import { countPendingIncomingNFes } from "@/server/actions/sefaz-radar";
import { getCurrentSensitiveValuesAccess, getCurrentModulePermissions } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvoicesTable } from "@/components/notas-fiscais/invoices-table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default async function NotasFiscaisPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = Number(pageSizeParam) > 0 ? Number(pageSizeParam) : 20;
  const [result, pendentesRadar, canSeeValues, modulePermissions] = await Promise.all([
    listInvoices(undefined, page, pageSize),
    countPendingIncomingNFes(),
    getCurrentSensitiveValuesAccess(),
    getCurrentModulePermissions(),
  ]);
  const canEdit = !modulePermissions.notasFiscaisSomenteLeitura;
  const invoices = result.items.map((invoice) => ({
    id: invoice.id,
    workId: invoice.workId,
    nome: invoice.nome,
    numero: invoice.numero,
    dataEmissao: invoice.dataEmissao,
    valorTotal: Number(invoice.valorTotal),
    supplier: { nome: invoice.supplier.nome },
    categoria: { nome: invoice.categoria.nome },
    work: invoice.work ? { nome: invoice.work.nome, codigo: invoice.work.codigo } : null,
  }));

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground">Compras e materiais lançados em todas as obras.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/notas-fiscais/download" />} nativeButton={false}>
            <Download /> Baixar em massa
          </Button>
          <Button variant="outline" render={<Link href="/notas-fiscais/radar" />} nativeButton={false}>
            <Radar /> Radar de NF-e
            {pendentesRadar > 0 ? <Badge variant="warning">{pendentesRadar}</Badge> : null}
          </Button>
          {canEdit ? (
            <Button render={<Link href="/notas-fiscais/nova" />} nativeButton={false}>
              <Plus /> Nova nota fiscal
            </Button>
          ) : null}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <InvoicesTable invoices={invoices} canSeeValues={canSeeValues} canEdit={canEdit} />
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-background p-4 md:p-6">
        <PaginationControls page={result.page} totalPages={result.totalPages} pageSize={result.pageSize} />
      </div>
    </div>
  );
}
