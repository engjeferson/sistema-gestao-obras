"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncIncomingNFes } from "@/server/actions/sefaz-radar";

export function RadarSyncButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const errorMessage = await syncIncomingNFes();
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.success("Sincronizado com a SEFAZ.");
      }
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      <RefreshCw className={isPending ? "animate-spin" : ""} />
      {isPending ? "Consultando SEFAZ..." : "Atualizar agora"}
    </Button>
  );
}
