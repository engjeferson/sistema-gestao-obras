"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeOff, Undo2, FileText, ExternalLink, Eye, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ignoreIncomingNFe, restoreIncomingNFe, manifestarIncomingNFe } from "@/server/actions/sefaz-radar";
import { TIPO_EVENTO_MANIFESTACAO } from "@/lib/sefaz/manifestacao-tipos";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

type IncomingNFeRow = {
  id: string;
  chaveAcesso: string;
  emitenteCnpj: string | null;
  emitenteNome: string | null;
  numero: string | null;
  serie: string | null;
  dataEmissao: Date | null;
  valorTotal: number | null;
  status: "PENDENTE" | "LANCADA" | "IGNORADA";
  xmlCompleto: boolean;
  manifestadoEm: Date | null;
  manifestacaoErro: string | null;
  invoiceLink: { invoiceId: string; workId: string | null; workLabel: string | null } | null;
};

const OE_FALLBACK_LABEL = "Estoque da Empresa";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Nova",
  LANCADA: "Lançada",
  IGNORADA: "Ignorada",
};

const STATUS_BADGE: Record<string, "success" | "secondary" | "warning"> = {
  PENDENTE: "warning",
  LANCADA: "success",
  IGNORADA: "secondary",
};

function RowActions({ row }: { row: IncomingNFeRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleIgnore() {
    startTransition(async () => {
      await ignoreIncomingNFe(row.id);
      toast.success("Nota ignorada.");
      router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      await restoreIncomingNFe(row.id);
      router.refresh();
    });
  }

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

  if (row.status === "LANCADA") {
    if (!row.invoiceLink) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    const href = row.invoiceLink.workId ? `/obras/${row.invoiceLink.workId}/materiais` : "/estoque";
    return (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" render={<Link href={`/notas-fiscais/${row.invoiceLink.invoiceId}`} />} nativeButton={false}>
          <Eye /> Ver detalhes
        </Button>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={href} />}
          nativeButton={false}
          title={row.invoiceLink.workLabel ?? "Estoque da Empresa"}
        >
          <ExternalLink /> Ver na obra
        </Button>
      </div>
    );
  }

  if (row.status === "IGNORADA") {
    return (
      <Button variant="ghost" size="sm" disabled={isPending} onClick={handleRestore}>
        <Undo2 /> Restaurar
      </Button>
    );
  }

  if (!row.xmlCompleto) {
    if (row.manifestadoEm) {
      return (
        <div className="flex justify-end items-center gap-2">
          <Badge variant="warning">Aguardando XML</Badge>
          <Button variant="ghost" size="sm" disabled={isPending} onClick={handleIgnore} title="Ignorar">
            <EyeOff />
          </Button>
        </div>
      );
    }
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={isPending} onClick={handleDarCiencia}>
          <BadgeCheck /> {isPending ? "Enviando..." : row.manifestacaoErro ? "Tentar novamente" : "Dar Ciência"}
        </Button>
        <Button variant="ghost" size="sm" disabled={isPending} onClick={handleIgnore} title="Ignorar">
          <EyeOff />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" render={<Link href={`/notas-fiscais/nova?radarId=${row.id}`} />} nativeButton={false}>
        Ver / Lançar
      </Button>
      <Button variant="ghost" size="sm" disabled={isPending} onClick={handleIgnore} title="Ignorar">
        <EyeOff />
      </Button>
    </div>
  );
}

export function IncomingNFeTable({ items }: { items: IncomingNFeRow[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma nota encontrada ainda. Clique em &quot;Atualizar agora&quot; para consultar a SEFAZ.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Emitente</TableHead>
            <TableHead>NF / Série</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>OE</TableHead>
            <TableHead>PDF</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Badge variant={STATUS_BADGE[row.status]}>{STATUS_LABELS[row.status]}</Badge>
              </TableCell>
              <TableCell className="font-medium">
                {row.emitenteNome ?? "—"}
                {!row.xmlCompleto && !row.manifestadoEm && row.manifestacaoErro ? (
                  <p className="mt-0.5 max-w-56 truncate text-xs font-normal text-destructive" title={row.manifestacaoErro}>
                    {row.manifestacaoErro}
                  </p>
                ) : null}
              </TableCell>
              <TableCell>
                {row.numero ?? "—"} / {row.serie ?? "—"}
              </TableCell>
              <TableCell>{row.dataEmissao ? formatDateBR(row.dataEmissao) : "—"}</TableCell>
              <TableCell>{row.valorTotal !== null ? formatCurrencyBRL(row.valorTotal) : "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.invoiceLink ? (row.invoiceLink.workLabel ?? OE_FALLBACK_LABEL) : "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  render={<a href={`/api/notas-fiscais/radar/${row.id}/pdf`} target="_blank" rel="noreferrer" />}
                  nativeButton={false}
                  title="Ver PDF"
                >
                  <FileText className="size-4" />
                </Button>
              </TableCell>
              <TableCell className="text-right">
                <RowActions row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
