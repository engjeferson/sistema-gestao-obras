"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { manifestarIncomingNFe, type NotaAguardandoManifestacao } from "@/server/actions/sefaz-radar";
import { TIPO_EVENTO_MANIFESTACAO } from "@/lib/sefaz/manifestacao-tipos";
import { formatDateBR, MANIFESTACAO_TIPO_LABELS } from "@/lib/status-labels";

const OBSERVACAO_MAX = 255;

function ManifestacaoDialog({
  row,
  open,
  onOpenChange,
}: {
  row: NotaAguardandoManifestacao;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tpEvento, setTpEvento] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConcluir() {
    if (!tpEvento) return;
    startTransition(async () => {
      const resultado = await manifestarIncomingNFe(
        row.id,
        tpEvento as (typeof TIPO_EVENTO_MANIFESTACAO)[keyof typeof TIPO_EVENTO_MANIFESTACAO],
        observacao || undefined,
      );
      if (resultado.ok) {
        toast.success(resultado.message);
      } else {
        toast.error(resultado.message);
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTpEvento("");
          setObservacao("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar status de manifestação</DialogTitle>
          <DialogDescription>Selecione o novo status e, se necessário, adicione uma observação.</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Última manifestação: {row.manifestacaoTipo ? MANIFESTACAO_TIPO_LABELS[row.manifestacaoTipo] : "Nenhuma"}
        </p>

        <div className="flex flex-col gap-2">
          <Label>Novo Status *</Label>
          <NativeSelect value={tpEvento} onChange={(e) => setTpEvento(e.target.value)}>
            <option value="">Selecione o novo status</option>
            {Object.values(TIPO_EVENTO_MANIFESTACAO).map((codigo) => (
              <option key={codigo} value={codigo}>
                {MANIFESTACAO_TIPO_LABELS[codigo]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Observação</Label>
          <Textarea
            placeholder="Descreva informações complementares para o novo status"
            maxLength={OBSERVACAO_MAX}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">
            {observacao.length} / {OBSERVACAO_MAX}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConcluir} disabled={!tpEvento || isPending}>
            {isPending ? "Enviando..." : "Concluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ row }: { row: NotaAguardandoManifestacao }) {
  const [dialogOpen, setDialogOpen] = useState(false);

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
      <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="shrink-0">
        <BadgeCheck />
        Manifestar
      </Button>
      <ManifestacaoDialog row={row} open={dialogOpen} onOpenChange={setDialogOpen} />
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
          Notas que a SEFAZ ainda só liberou como resumo, sem os itens. Manifestar sinaliza o status da operação pra
          SEFAZ — normalmente libera o XML completo em seguida.
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
