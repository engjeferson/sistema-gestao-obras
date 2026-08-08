import Link from "next/link";
import { Plus } from "lucide-react";
import { listInvoices } from "@/server/actions/notas-fiscais";
import { Button } from "@/components/ui/button";
import { InvoicesTable } from "@/components/notas-fiscais/invoices-table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default async function NotasFiscaisPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const result = await listInvoices(undefined, page);
  const invoices = result.items.map((invoice) => ({
    id: invoice.id,
    workId: invoice.workId,
    numero: invoice.numero,
    dataEmissao: invoice.dataEmissao,
    valorTotal: Number(invoice.valorTotal),
    supplier: { nome: invoice.supplier.nome },
    categoria: { nome: invoice.categoria.nome },
    work: invoice.work ? { nome: invoice.work.nome, codigo: invoice.work.codigo } : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground">Compras e materiais lançados em todas as obras.</p>
        </div>
        <Button render={<Link href="/notas-fiscais/nova" />} nativeButton={false}>
          <Plus /> Nova nota fiscal
        </Button>
      </div>

      <InvoicesTable invoices={invoices} />
      <PaginationControls page={result.page} totalPages={result.totalPages} />
    </div>
  );
}
