"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { WORK_STATUS_LABELS } from "@/lib/status-labels";
import type { WorkModel } from "@/generated/prisma/models";

type ObraFormDefaultValues = Partial<Omit<WorkModel, "valorContrato" | "areaConstruida">> & {
  valorContrato?: number;
  areaConstruida?: number | null;
  clienteNome?: string;
};

type ObraFormProps = {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  defaultValues?: ObraFormDefaultValues;
  submitLabel: string;
};

function toDateInputValue(date: Date | string | undefined | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function ObraForm({ action, defaultValues, submitLabel }: ObraFormProps) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome da obra</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" name="codigo" defaultValue={defaultValues?.codigo} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="clienteNome">Cliente</Label>
          <Input id="clienteNome" name="clienteNome" defaultValue={defaultValues?.clienteNome} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" defaultValue={defaultValues?.telefone ?? ""} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" defaultValue={defaultValues?.endereco ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valorContrato">Valor do contrato (R$)</Label>
          <Input
            id="valorContrato"
            name="valorContrato"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.valorContrato?.toString()}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="areaConstruida">Área construída (m²)</Label>
          <Input
            id="areaConstruida"
            name="areaConstruida"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.areaConstruida?.toString() ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataInicio">Data de início</Label>
          <Input
            id="dataInicio"
            name="dataInicio"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataInicio)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataPrevistaTermino">Data prevista de término</Label>
          <Input
            id="dataPrevistaTermino"
            name="dataPrevistaTermino"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataPrevistaTermino)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={defaultValues?.status ?? "PLANEJAMENTO"}>
            {Object.entries(WORK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
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
