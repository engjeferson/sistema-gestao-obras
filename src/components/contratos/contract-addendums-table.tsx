"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteContractAddendum } from "@/server/actions/contratos";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

type AddendumRow = {
  id: string;
  data: Date;
  descricao: string | null;
  valor: number;
  observacoes: string | null;
};

function DeleteButton({ addendumId, workId, contractId }: { addendumId: string; workId: string; contractId: string }) {
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
        await deleteContractAddendum(addendumId, workId, contractId);
        toast.success("Aditivo excluído.");
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

export function ContractAddendumsTable({
  addendums,
  workId,
  contractId,
}: {
  addendums: AddendumRow[];
  workId: string;
  contractId: string;
}) {
  if (addendums.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum aditivo lançado ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {addendums.map((addendum) => (
            <TableRow key={addendum.id}>
              <TableCell>{formatDateBR(addendum.data)}</TableCell>
              <TableCell>{addendum.descricao ?? "—"}</TableCell>
              <TableCell className="max-w-[280px] truncate">{addendum.observacoes ?? "—"}</TableCell>
              <TableCell className="font-medium text-success">+{formatCurrencyBRL(addendum.valor)}</TableCell>
              <TableCell className="text-right">
                <DeleteButton addendumId={addendum.id} workId={workId} contractId={contractId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
