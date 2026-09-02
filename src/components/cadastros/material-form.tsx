"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import type { MaterialModel } from "@/generated/prisma/models";

const UNIT_LABELS: Record<string, string> = {
  UN: "un",
  KG: "kg",
  M: "m",
  M2: "m²",
  M3: "m³",
  SACO: "saco",
  CAIXA: "caixa",
  LITRO: "litro",
};

export function MaterialForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  defaultValues?: Partial<MaterialModel>;
  submitLabel: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="nome">Nome do material</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unidadePadrao">Unidade padrão</Label>
          <NativeSelect id="unidadePadrao" name="unidadePadrao" defaultValue={defaultValues?.unidadePadrao ?? ""}>
            <option value="">—</option>
            {Object.entries(UNIT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="precoUnitario">Preço unitário</Label>
          <CurrencyInput
            id="precoUnitario"
            name="precoUnitario"
            defaultValue={defaultValues?.precoUnitario !== null && defaultValues?.precoUnitario !== undefined ? Number(defaultValues.precoUnitario) : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input id="categoria" name="categoria" defaultValue={defaultValues?.categoria ?? ""} placeholder="Ex: Cimento e argamassa" />
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
