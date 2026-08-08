"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteInvoice } from "@/server/actions/notas-fiscais";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

type InvoiceRow = {
  id: string;
  workId: string | null;
  numero: string;
  dataEmissao: Date;
  valorTotal: number;
  supplier: { nome: string };
  categoria: { nome: string };
  work: { nome: string; codigo: string } | null;
};

function DeleteInvoiceButton({ invoiceId, workId }: { invoiceId: string; workId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteInvoice(invoiceId, workId);
        toast.success("Nota fiscal excluída.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      } finally {
        setConfirming(false);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={handleClick}
      className={confirming ? "text-destructive" : ""}
      title={confirming ? "Confirmar exclusão" : "Excluir"}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function InvoicesTable({
  invoices,
  showObraColumn = true,
}: {
  invoices: InvoiceRow[];
  showObraColumn?: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma nota fiscal lançada ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>NF</TableHead>
            {showObraColumn ? <TableHead>Obra</TableHead> : null}
            <TableHead>Fornecedor</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor total</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.numero}</TableCell>
              {showObraColumn ? <TableCell>{invoice.work?.codigo ?? "Estoque Geral"}</TableCell> : null}
              <TableCell>{invoice.supplier.nome}</TableCell>
              <TableCell>{invoice.categoria.nome}</TableCell>
              <TableCell>{formatDateBR(invoice.dataEmissao)}</TableCell>
              <TableCell>{formatCurrencyBRL(invoice.valorTotal)}</TableCell>
              <TableCell className="text-right">
                <DeleteInvoiceButton invoiceId={invoice.id} workId={invoice.workId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
