"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { manifestarIncomingNFe, type NotaAguardandoManifestacao } from "@/server/actions/sefaz-radar";
import { TIPO_EVENTO_MANIFESTACAO } from "@/lib/sefaz/manifestacao-tipos";
import { formatDateBR } from "@/lib/status-labels";

// Estado exibido na lista, derivado dos campos já existentes em IncomingNFe
// (nenhum status novo persistido — evita duplicar estrutura):
// - manifestadoEm setado           -> "Aguardando XML" (ciência registrada, esperando a SEFAZ liberar o XML completo)
// - manifestacaoErro setado (sem manifestadoEm) -> "Erro na manifestação"
// - nenhum dos dois                -> "Aguardando manifestação"
function situacao(row: NotaAguardandoManifestacao): "aguardando_xml" | "erro" | "localizada" {
  if (row.manifestadoEm) return "aguardando_xml";
  if (row.manifestacaoErro) return "erro";
  return "localizada";
}

function Row({ row }: { row: NotaAguardandoManifestacao }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const estado = situacao(row);

  function handleDarCiencia() {
    startTransition(async () => {
      const resultado = await manifestarIncomingNFe(row.id, TIPO_EVENTO_MANIFESTACAO.CIENCIA_OPERACAO);
      if (resultado.ok) {
        toast.success("Ciência registrada. Aguardando XML completo da SEFAZ.");
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
        {estado === "erro" ? <p className="mt-1 text-xs text-destructive">Erro na manifestação — tente novamente.</p> : null}
      </div>
      {estado === "aguardando_xml" ? (
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Aguardando XML</span>
      ) : (
        <Button size="sm" variant="outline" disabled={isPending} onClick={handleDarCiencia} className="shrink-0">
          <BadgeCheck />
          {isPending ? "Enviando..." : estado === "erro" ? "Tentar novamente" : "Dar Ciência"}
        </Button>
      )}
    </div>
  );
}

export function PendingManifestacaoList({ items }: { items: NotaAguardandoManifestacao[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border">
      <div className="border-b bg-muted/30 p-3">
        <p className="text-sm font-medium">Aguardando manifestação ({items.length})</p>
        <p className="text-xs text-muted-foreground">
          Notas que a SEFAZ ainda só liberou como resumo, sem os itens. Dar ciência sinaliza que você está ciente da
          operação — a SEFAZ costuma liberar o XML completo entre 30min e 1h depois.
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
