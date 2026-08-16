"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteStage, deleteTask } from "@/server/actions/planejamento";

export function DeleteStageButton({ stageId, workId }: { stageId: string; workId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Excluir esta etapa/sub? Isso também apaga tudo dentro dela (subs e itens). Essa ação não pode ser desfeita.")) {
          return;
        }
        startTransition(async () => {
          await deleteStage(stageId, workId);
          toast.success("Etapa removida.");
          router.refresh();
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function DeleteTaskButton({ taskId, workId }: { taskId: string; workId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Excluir este item? Essa ação não pode ser desfeita.")) return;
        startTransition(async () => {
          await deleteTask(taskId, workId);
          toast.success("Item removido.");
          router.refresh();
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
