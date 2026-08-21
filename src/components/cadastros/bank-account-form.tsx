"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import type { BankAccountModel } from "@/generated/prisma/models";

const TIPO_LABELS: Record<string, string> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Poupança",
  CAIXA: "Caixa (dinheiro)",
  CARTAO_CREDITO: "Cartão de crédito",
  OUTRA: "Outra",
};

type BankAccountFormDefaultValues = Partial<Omit<BankAccountModel, "saldoInicial">> & {
  saldoInicial?: number | null;
};

export function BankAccountForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  defaultValues?: BankAccountFormDefaultValues;
  submitLabel: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="nome">Nome da conta</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} placeholder="Ex: Banco do Brasil - CC" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <NativeSelect id="tipo" name="tipo" defaultValue={defaultValues?.tipo ?? "CORRENTE"}>
            {Object.entries(TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="banco">Banco</Label>
          <Input id="banco" name="banco" defaultValue={defaultValues?.banco ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="agencia">Agência</Label>
          <Input id="agencia" name="agencia" defaultValue={defaultValues?.agencia ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="conta">Conta</Label>
          <Input id="conta" name="conta" defaultValue={defaultValues?.conta ?? ""} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="saldoInicial">Saldo inicial (R$)</Label>
          <CurrencyInput id="saldoInicial" name="saldoInicial" defaultValue={defaultValues?.saldoInicial ?? undefined} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
