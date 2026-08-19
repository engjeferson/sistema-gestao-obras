"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { batchMarkAsPago } from "@/server/actions/financeiro";
import {
  TRANSACTION_STATUS_BADGE,
  TRANSACTION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCurrencyBRL,
  formatDateBR,
} from "@/lib/status-labels";
import type { PaymentMethod } from "@/generated/prisma/enums";

type OpenTransaction = {
  id: string;
  descricao: string;
  valor: unknown;
  dataVencimento: Date;
  effectiveStatus: string;
  work: { nome: string; codigo: string } | null;
};

export function BatchPaymentView({
  suppliers,
  supplierId,
  transactions,
  canEdit,
}: {
  suppliers: { id: string; nome: string }[];
  supplierId: string;
  transactions: OpenTransaction[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formaPagamento, setFormaPagamento] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalExibido = useMemo(() => transactions.reduce((sum, t) => sum + Number(t.valor), 0), [transactions]);
  const totalSelecionado = useMemo(
    () => transactions.filter((t) => selected.has(t.id)).reduce((sum, t) => sum + Number(t.valor), 0),
    [transactions, selected],
  );

  function handleSupplierChange(value: string) {
    setSelected(new Set());
    router.push(value ? `/financeiro/pagamento-em-lote?supplierId=${value}` : "/financeiro/pagamento-em-lote");
  }

  function toggle(id: string) {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!canEdit) return;
    setSelected((prev) => (prev.size === transactions.length ? new Set() : new Set(transactions.map((t) => t.id))));
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
        router.refresh();
      } catch {
        toast.error("Não foi possível confirmar o pagamento.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <NativeSelect
        className="w-auto min-w-[16rem]"
        value={supplierId}
        onChange={(e) => handleSupplierChange(e.target.value)}
      >
        <option value="">Selecione um fornecedor</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.nome}
          </option>
        ))}
      </NativeSelect>

      {!supplierId ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Selecione um fornecedor para ver as contas em aberto.
        </p>
      ) : transactions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma conta em aberto para este fornecedor.
        </p>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === transactions.length}
                      onChange={toggleAll}
                      disabled={!canEdit}
                    />
                  </TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={canEdit ? "cursor-pointer" : undefined}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                        disabled={!canEdit}
                      />
                    </TableCell>
                    <TableCell>{formatDateBR(t.dataVencimento)}</TableCell>
                    <TableCell className="font-medium">{t.descricao}</TableCell>
                    <TableCell>{t.work ? `${t.work.codigo} — ${t.work.nome}` : "Despesa geral"}</TableCell>
                    <TableCell>{formatCurrencyBRL(Number(t.valor))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={TRANSACTION_STATUS_BADGE[t.effectiveStatus]}
                        className={t.effectiveStatus === "VENCIDO" ? "animate-pulse-subtle" : undefined}
                      >
                        {TRANSACTION_STATUS_LABELS[t.effectiveStatus]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Total exibido ({transactions.length})</p>
                <p className="text-lg font-heading font-semibold">{formatCurrencyBRL(totalExibido)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selecionado ({selected.size})</p>
                <p className="text-lg font-heading font-semibold text-primary">
                  {formatCurrencyBRL(totalSelecionado)}
                </p>
              </div>
            </div>

            {canEdit ? (
              <div className="flex items-center gap-2">
                <NativeSelect
                  className="w-auto"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                >
                  <option value="">Forma de pagamento (opcional)</option>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
                <Button disabled={selected.size === 0 || isPending} onClick={handleConfirm}>
                  Confirmar pagamento
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
