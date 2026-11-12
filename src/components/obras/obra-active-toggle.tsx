"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleWorkActive } from "@/server/actions/obras";

export function ObraActiveToggle({ workId, ativo }: { workId: string; ativo: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      try {
        const error = await toggleWorkActive(workId, checked);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success(checked ? "Obra marcada como ativa." : "Obra marcada como inativa.");
        router.refresh();
      } catch {
        toast.error("Não foi possível atualizar.");
      }
    });
  }

  return (
    <Switch
      checked={ativo}
      onCheckedChange={handleChange}
      disabled={isPending}
      title={ativo ? "Obra ativa — clique para marcar como inativa" : "Obra inativa — clique para marcar como ativa"}
    />
  );
}
