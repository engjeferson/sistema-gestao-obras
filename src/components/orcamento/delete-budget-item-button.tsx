"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteBudgetItem } from "@/server/actions/orcamento";

export function DeleteBudgetItemButton({ itemId, workId }: { itemId: string; workId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const error = await deleteBudgetItem(itemId, workId);
            if (error) {
              toast.error(error);
              return;
            }
            toast.success("Custo previsto removido.");
            router.refresh();
          } catch {
            toast.error("Não foi possível excluir.");
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
