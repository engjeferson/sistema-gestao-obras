"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { manifestarCienciaIncomingNFe, type NotaAguardandoManifestacao } from "@/server/actions/sefaz-radar";
import { formatDateBR } from "@/lib/status-labels";

function Row({ row }: { row: NotaAguardandoManifestacao }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleManifestar() {
    startTransition(async () => {
      const resultado = await manifestarCienciaIncomingNFe(row.id);
      if (resultado.ok) {
        toast.success(resultado.message);
      } else {
        toast.error(resultado.message);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-b p-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{row.emitenteNome ?? "Emitente desconhecido"}</p>
        <p className="truncate text-xs text-muted-foreground">
          NF {row.numero ?? "—"}/{row.serie ?? "—"} · {row.dataEmissao ? formatDateBR(row.dataEmissao) : "—"} · chave{" "}
          {row.chaveAcesso}
        </p>
        {row.manifestacaoErro ? <p className="mt-1 break-all text-xs text-destructive">{row.manifestacaoErro}</p> : null}
      </div>
      <Button size="sm" variant="outline" disabled={isPending} onClick={handleManifestar} className="shrink-0">
        <BadgeCheck className={isPending ? "animate-pulse" : ""} />
        {isPending ? "Enviando..." : "Manifestar ciência"}
      </Button>
    </div>
  );
}

export function PendingManifestacaoList({ items }: { items: NotaAguardandoManifestacao[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border">
      <div className="border-b bg-muted/30 p-3">
        <p className="text-sm font-medium">Aguardando liberação da SEFAZ ({items.length})</p>
        <p className="text-xs text-muted-foreground">
          Notas que a SEFAZ ainda só liberou como resumo, sem os itens. Manifestar ciência sinaliza que você está
          ciente da operação — normalmente libera o XML completo em seguida.
        </p>
      </div>
      <div>
        {items.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}
