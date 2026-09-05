"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, CheckCircle2, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { markAsPago, deleteTransaction } from "@/server/actions/financeiro";
import { PartialPaymentDialog } from "@/components/financeiro/partial-payment-dialog";

export function TransactionRowActions({
  transactionId,
  workId,
  status,
  valor,
  dataVencimento,
}: {
  transactionId: string;
  workId: string | null;
  status: string;
  valor: number;
  dataVencimento: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [partialPaymentOpen, setPartialPaymentOpen] = useState(false);
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
        <>
          <Button
            variant="ghost"
            size="icon"
            title="Pagamento parcial"
            disabled={isPending}
            onClick={() => setPartialPaymentOpen(true)}
          >
            <SplitSquareHorizontal className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Marcar como pago" disabled={isPending} onClick={handleMarkAsPago}>
            <CheckCircle2 className="size-4" />
          </Button>
        </>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        title="Excluir"
        disabled={isPending}
        onClick={() => setConfirmingDelete(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <PartialPaymentDialog
        open={partialPaymentOpen}
        onOpenChange={setPartialPaymentOpen}
        transactionId={transactionId}
        workId={workId}
        valorTotal={valor}
        vencimentoAtual={dataVencimento}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Excluir lançamento"
        description="Tem certeza que deseja excluir este lançamento? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        isPending={isPending}
        destructive
      />
    </div>
  );
}
