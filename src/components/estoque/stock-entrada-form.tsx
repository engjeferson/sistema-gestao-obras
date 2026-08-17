"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createStockEntrada } from "@/server/actions/estoque";

type StageOption = { id: string; codigo: string | null; nome: string };

export function StockEntradaForm({
  materials,
  works,
  stagesByWork,
  defaultWorkId,
}: {
  materials: { id: string; nome: string }[];
  works: { id: string; nome: string; codigo: string }[];
  stagesByWork: Record<string, StageOption[]>;
  defaultWorkId?: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(createStockEntrada, undefined);
  const [destinoWorkId, setDestinoWorkId] = useState(defaultWorkId ?? "");
  const stagesForWork = stagesByWork[destinoWorkId] ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="materialId">Material</Label>
          <NativeSelect id="materialId" name="materialId" defaultValue="" required>
            <option value="" disabled>
              Selecione o material
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="destinoWorkId">Destino</Label>
          <NativeSelect
            id="destinoWorkId"
            name="destinoWorkId"
            value={destinoWorkId}
            onChange={(e) => setDestinoWorkId(e.target.value)}
          >
            <option value="">Estoque Geral</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.codigo} — {work.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        {destinoWorkId ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="stageId">Etapa</Label>
            <NativeSelect id="stageId" name="stageId" defaultValue="" key={destinoWorkId}>
              <option value="">—</option>
              {stagesForWork.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.codigo ? `${stage.codigo} — ` : ""}
                  {stage.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantidade">Quantidade</Label>
          <Input id="quantidade" name="quantidade" type="number" step="0.001" min="0.001" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valorUnitario">Valor unitário</Label>
          <CurrencyInput id="valorUnitario" name="valorUnitario" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="motivo">Motivo / observação</Label>
          <Input id="motivo" name="motivo" placeholder="Ex: Compra avulsa, recebimento de fornecedor" />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Registrar entrada"}
        </Button>
      </div>
    </form>
  );
}
