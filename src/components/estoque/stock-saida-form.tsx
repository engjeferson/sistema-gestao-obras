"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createStockSaida } from "@/server/actions/estoque";

export function StockSaidaForm({
  materials,
  works,
  balances,
  defaultWorkId,
}: {
  materials: { id: string; nome: string }[];
  works: { id: string; nome: string; codigo: string }[];
  balances: Record<string, Record<string, number>>;
  defaultWorkId?: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(createStockSaida, undefined);
  const [origemWorkId, setOrigemWorkId] = useState(defaultWorkId ?? "");
  const [materialId, setMaterialId] = useState("");
  const saldoAtual = balances[origemWorkId || "geral"]?.[materialId] ?? 0;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="materialId">Material</Label>
          <NativeSelect
            id="materialId"
            name="materialId"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione o material
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.nome}
              </option>
            ))}
          </NativeSelect>
          {materialId ? (
            <p className="text-xs text-muted-foreground">Saldo disponível na origem: {saldoAtual}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="origemWorkId">Origem</Label>
          <NativeSelect
            id="origemWorkId"
            name="origemWorkId"
            value={origemWorkId}
            onChange={(e) => setOrigemWorkId(e.target.value)}
          >
            <option value="">Estoque Geral</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.codigo} — {work.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantidade">Quantidade</Label>
          <Input id="quantidade" name="quantidade" type="number" step="0.001" min="0.001" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valorUnitario">Valor unitário</Label>
          <Input id="valorUnitario" name="valorUnitario" type="number" step="0.01" min="0" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="motivo">Motivo / observação</Label>
          <Input id="motivo" name="motivo" placeholder="Ex: Uso na obra, perda, descarte" />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Registrar saída"}
        </Button>
      </div>
    </form>
  );
}
