"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { partialPayTransaction } from "@/server/actions/financeiro";
import { PAYMENT_METHOD_LABELS, formatCurrencyBRL } from "@/lib/status-labels";
import type { PaymentMethod } from "@/generated/prisma/enums";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function PartialPaymentDialog({
  open,
  onOpenChange,
  transactionId,
  workId,
  valorTotal,
  vencimentoAtual,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  workId: string | null;
  valorTotal: number;
  vencimentoAtual: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valorPago, setValorPago] = useState<number | undefined>(undefined);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState(todayStr());
  const [novoVencimento, setNovoVencimento] = useState("");

  const valorResidual = valorPago && valorPago > 0 && valorPago < valorTotal ? valorTotal - valorPago : null;

  function handleConfirm() {
    if (!valorPago || valorPago <= 0 || valorPago >= valorTotal) {
      toast.error("Informe um valor pago maior que zero e menor que o total da conta.");
      return;
    }
    startTransition(async () => {
      try {
        await partialPayTransaction(transactionId, workId, {
          valorPago,
          formaPagamento: (formaPagamento as PaymentMethod) || undefined,
          dataPagamento,
          novoVencimento: novoVencimento || undefined,
        });
        toast.success("Pagamento parcial registrado.");
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível registrar o pagamento.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento parcial</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Valor total da conta: <span className="font-medium text-foreground">{formatCurrencyBRL(valorTotal)}</span>
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valorPago">Valor pago agora</Label>
            <CurrencyInput id="valorPago" value={valorPago} onValueChange={setValorPago} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dataPagamento">Data do pagamento</Label>
            <Input
              id="dataPagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="formaPagamento">Forma de pagamento (opcional)</Label>
            <NativeSelect id="formaPagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="">Selecione</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="novoVencimento">Novo vencimento do saldo residual (opcional)</Label>
            <Input
              id="novoVencimento"
              type="date"
              value={novoVencimento}
              onChange={(e) => setNovoVencimento(e.target.value)}
              placeholder={vencimentoAtual}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para manter o vencimento atual ({new Date(vencimentoAtual).toLocaleDateString("pt-BR")}).
            </p>
          </div>

          {valorResidual !== null ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Saldo residual a gerar: <span className="font-medium text-foreground">{formatCurrencyBRL(valorResidual)}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Salvando..." : "Confirmar pagamento parcial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
