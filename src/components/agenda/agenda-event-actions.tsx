"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAgendaEvent, setAgendaEventStatus } from "@/server/actions/agenda";

export function AgendaEventActions({ eventId, status }: { eventId: string; status: "CONFIRMADO" | "CANCELADO" }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleStatus() {
    const nextStatus = status === "CONFIRMADO" ? "CANCELADO" : "CONFIRMADO";
    startTransition(async () => {
      await setAgendaEventStatus(eventId, nextStatus);
      toast.success(nextStatus === "CANCELADO" ? "Compromisso cancelado." : "Compromisso reativado.");
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Excluir este compromisso? Essa ação não pode ser desfeita.")) return;
    startTransition(async () => {
      await deleteAgendaEvent(eventId);
      toast.success("Compromisso excluído.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" disabled={isPending} render={<Link href={`/agenda/${eventId}/editar`} />} nativeButton={false}>
        <Pencil className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={toggleStatus} title={status === "CONFIRMADO" ? "Cancelar" : "Reativar"}>
        {status === "CONFIRMADO" ? <X className="size-3.5" /> : <Undo2 className="size-3.5" />}
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={remove}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
