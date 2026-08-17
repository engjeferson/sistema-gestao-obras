"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createBudgetItem } from "@/server/actions/orcamento";
import { costTypeValues } from "@/lib/validations/orcamento";
import { COST_TYPE_LABELS, UNIT_LABELS } from "@/lib/status-labels";

export function AddBudgetItemForm({ workId, taskId }: { workId: string; taskId: string }) {
  const [open, setOpen] = useState(false);
  const [errorMessage, formAction, isPending] = useActionState(createBudgetItem, undefined);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus /> Adicionar custo previsto
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="taskId" value={taskId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Tipo de custo</label>
        <NativeSelect name="tipoCusto" defaultValue="MATERIAL" className="w-40">
          {costTypeValues.map((value) => (
            <option key={value} value={value}>
              {COST_TYPE_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Descrição</label>
        <Input name="descricao" placeholder="Opcional" className="w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Unidade</label>
        <NativeSelect name="unidade" defaultValue="" className="w-24">
          <option value="">—</option>
          {Object.entries(UNIT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Quantidade</label>
        <Input name="quantidadePrevista" type="number" step="0.001" min="0" className="w-24" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Valor unit. (R$)</label>
        <CurrencyInput name="valorUnitarioPrevisto" className="w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Ou valor total (R$)</label>
        <CurrencyInput name="valorTotalPrevisto" className="w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Observações</label>
        <Input name="observacoes" placeholder="Opcional" className="w-40" />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Adicionar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      {errorMessage ? <p className="w-full text-sm text-destructive">{errorMessage}</p> : null}
    </form>
  );
}
