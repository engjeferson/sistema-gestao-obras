import Link from "next/link";
import { Plus } from "lucide-react";
import { listInvoices } from "@/server/actions/notas-fiscais";
import { getCurrentSensitiveValuesAccess, getCurrentModulePermissions } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { InvoicesTable } from "@/components/notas-fiscais/invoices-table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default async function MateriaisPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const [result, canSeeValues, modulePermissions] = await Promise.all([
    listInvoices(id, page),
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
    work: invoice.work ? { nome: invoice.work.nome, codigo: invoice.work.codigo } : { nome: "—", codigo: "—" },
  }));

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex items-center justify-end">
          <Button size="sm" render={<Link href={`/notas-fiscais/nova?workId=${id}`} />} nativeButton={false}>
            <Plus /> Nova nota fiscal
          </Button>
        </div>
      ) : null}
      <InvoicesTable invoices={invoices} showObraColumn={false} canSeeValues={canSeeValues} canEdit={canEdit} />
      <PaginationControls page={result.page} totalPages={result.totalPages} />
    </div>
  );
}
