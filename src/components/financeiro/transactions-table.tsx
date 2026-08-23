"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransactionRowActions } from "@/components/financeiro/transaction-row-actions";
import { batchMarkAsPago } from "@/server/actions/financeiro";
import {
  TRANSACTION_STATUS_BADGE,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  UNIT_LABELS,
  formatCurrencyBRL,
  formatDateBR,
} from "@/lib/status-labels";
import type { PaymentMethod } from "@/generated/prisma/enums";

type InvoiceItemRow = {
  material: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
};

type TransactionRow = {
  id: string;
  workId: string | null;
  tipo: string;
  descricao: string;
  favorecidoNome: string;
  valor: unknown;
  dataVencimento: Date;
  effectiveStatus: string;
  categoria: { nome: string };
  work: { nome: string; codigo: string } | null;
  invoice: { items: InvoiceItemRow[] } | null;
};

export function TransactionsTable({
  transactions,
  showObraColumn = true,
  canEdit = true,
  selectable = false,
}: {
  transactions: TransactionRow[];
  showObraColumn?: boolean;
  canEdit?: boolean;
  selectable?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [materiaisDe, setMateriaisDe] = useState<TransactionRow | null>(null);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [isPending, startTransition] = useTransition();

  const showSelection = selectable && canEdit;
  const eligibleIds = useMemo(
    () => transactions.filter((t) => t.effectiveStatus !== "PAGO").map((t) => t.id),
    [transactions],
  );
  const totalSelecionado = useMemo(
    () => transactions.filter((t) => selected.has(t.id)).reduce((sum, t) => sum + Number(t.valor), 0),
    [transactions, selected],
  );

  useEffect(() => {
    const currentIds = new Set(transactions.map((t) => t.id));
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((id) => currentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [transactions]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      eligibleIds.length > 0 && eligibleIds.every((id) => prev.has(id)) ? new Set() : new Set(eligibleIds),
    );
  }

  function handleConfirm() {
    const ids = Array.from(selected);
    const confirmed = window.confirm(
      `Marcar ${ids.length} conta(s) como pagas, totalizando ${formatCurrencyBRL(totalSelecionado)}?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await batchMarkAsPago(ids, (formaPagamento as PaymentMethod) || undefined);
        toast.success("Contas marcadas como pagas.");
        setSelected(new Set());
        setFormaPagamento("");
        router.refresh();
      } catch {
        toast.error("Não foi possível confirmar o pagamento.");
      }
    });
  }

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum lançamento encontrado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              {showSelection ? (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id))}
                    onChange={toggleAll}
                    disabled={eligibleIds.length === 0}
                  />
                </TableHead>
              ) : null}
              <TableHead>Descrição</TableHead>
              {showObraColumn ? <TableHead>Obra</TableHead> : null}
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Favorecido</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => {
              const items = t.invoice?.items ?? [];
              return (
              <TableRow key={t.id}>
                <TableCell>
                  {items.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setMateriaisDe(t)}
                      className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Ver materiais"
                    >
                      <Layers className="size-4" />
                    </button>
                  ) : null}
                </TableCell>
                {showSelection ? (
                  <TableCell>
                    {t.effectiveStatus !== "PAGO" ? (
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                    ) : null}
                  </TableCell>
                ) : null}
                <TableCell>
                  {canEdit ? (
                    <Link
                      href={`/financeiro/${t.id}/editar`}
                      title={t.descricao}
                      className="block max-w-[220px] truncate font-medium hover:underline"
                    >
                      {t.descricao}
                    </Link>
                  ) : (
                    <span title={t.descricao} className="block max-w-[220px] truncate font-medium">
                      {t.descricao}
                    </span>
                  )}
                </TableCell>
                {showObraColumn ? (
                  <TableCell>
                    {t.work ? (
                      <Link href={`/obras/${t.workId}`} className="hover:underline">
                        {t.work.codigo}
                      </Link>
                    ) : (
                      "Despesa geral"
                    )}
                  </TableCell>
                ) : null}
                <TableCell>{TRANSACTION_TYPE_LABELS[t.tipo]}</TableCell>
                <TableCell>{t.categoria.nome}</TableCell>
                <TableCell>{t.favorecidoNome}</TableCell>
                <TableCell>{formatDateBR(t.dataVencimento)}</TableCell>
                <TableCell>{formatCurrencyBRL(Number(t.valor))}</TableCell>
                <TableCell>
                  <Badge
                    variant={TRANSACTION_STATUS_BADGE[t.effectiveStatus]}
                    className={t.effectiveStatus === "VENCIDO" ? "animate-pulse-subtle" : undefined}
                  >
                    {TRANSACTION_STATUS_LABELS[t.effectiveStatus]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <TransactionRowActions
                      transactionId={t.id}
                      workId={t.workId}
                      status={t.effectiveStatus}
                      valor={Number(t.valor)}
                      dataVencimento={t.dataVencimento.toISOString().slice(0, 10)}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={materiaisDe !== null} onOpenChange={(open) => !open && setMateriaisDe(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Materiais — {materiaisDe?.descricao}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {(materiaisDe?.invoice?.items ?? []).map((item, index) => (
                  <tr key={index} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-4 whitespace-nowrap">{item.material}</td>
                    <td className="py-1.5 pr-4 whitespace-nowrap text-muted-foreground">
                      {item.quantidade} {UNIT_LABELS[item.unidade] ?? item.unidade}
                    </td>
                    <td className="py-1.5 pr-4 whitespace-nowrap text-muted-foreground">
                      {formatCurrencyBRL(item.valorUnitario)}/un
                    </td>
                    <td className="py-1.5 text-right font-medium whitespace-nowrap">
                      {formatCurrencyBRL(item.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {showSelection && selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Selecionado ({selected.size})</p>
            <p className="text-lg font-heading font-semibold text-primary">{formatCurrencyBRL(totalSelecionado)}</p>
          </div>
          <div className="flex items-center gap-2">
            <NativeSelect className="w-auto" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="">Forma de pagamento (opcional)</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <Button disabled={isPending} onClick={handleConfirm}>
              Confirmar pagamento
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
