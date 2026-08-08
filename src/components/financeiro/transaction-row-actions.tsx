"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAsPago, deleteTransaction } from "@/server/actions/financeiro";

export function TransactionRowActions({
  transactionId,
  workId,
  status,
}: {
  transactionId: string;
  workId: string | null;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  function handleMarkAsPago() {
    startTransition(async () => {
      try {
        await markAsPago(transactionId, workId);
        toast.success("Conta marcada como paga.");
        router.refresh();
      } catch {
        toast.error("Não foi possível marcar como paga.");
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteTransaction(transactionId, workId);
        toast.success("Lançamento excluído.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      } finally {
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "PAGO" ? (
        <Button variant="ghost" size="icon" title="Marcar como pago" disabled={isPending} onClick={handleMarkAsPago}>
          <CheckCircle2 className="size-4" />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        title={confirmingDelete ? "Confirmar exclusão" : "Excluir"}
        disabled={isPending}
        onClick={handleDelete}
        className={confirmingDelete ? "text-destructive" : ""}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
