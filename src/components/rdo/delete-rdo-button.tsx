"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteRdo } from "@/server/actions/rdo";

export function DeleteRdoButton({ rdoId, workId, basePath }: { rdoId: string; workId: string; basePath: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const error = await deleteRdo(rdoId, workId);
        if (error) {
          toast.error(error);
          setConfirming(false);
          return;
        }
        toast.success("RDO excluído.");
        router.push(`${basePath}/rdo`);
        router.refresh();
      } catch {
        toast.error("Não foi possível excluir.");
        setConfirming(false);
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => setConfirming(true)}>
        <Trash2 /> Excluir
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir RDO"
        description="Tem certeza que deseja excluir este RDO? Essa ação não pode ser desfeita e pode alterar o percentual de progresso das atividades vinculadas."
        confirmLabel="Excluir"
        onConfirm={handleConfirm}
        isPending={isPending}
        destructive
      />
    </>
  );
}
