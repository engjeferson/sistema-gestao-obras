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
      onClick={() =>
        startTransition(async () => {
          await deleteStage(stageId, workId);
          toast.success("Etapa removida.");
          router.refresh();
        })
      }
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
      onClick={() =>
        startTransition(async () => {
          await deleteTask(taskId, workId);
          toast.success("Atividade removida.");
          router.refresh();
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
