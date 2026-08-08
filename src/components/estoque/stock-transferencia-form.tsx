"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { StockTransferItemsEditor } from "@/components/estoque/stock-transfer-items-editor";
import { createStockTransferencia } from "@/server/actions/estoque";
import type { StockTransferItemValues } from "@/lib/validations/estoque";

export function StockTransferenciaForm({
  materials,
  works,
  balances,
  defaultOrigemWorkId,
}: {
  materials: { id: string; nome: string }[];
  works: { id: string; nome: string; codigo: string }[];
  balances: Record<string, Record<string, number>>;
  defaultOrigemWorkId?: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(createStockTransferencia, undefined);
  const [origemWorkId, setOrigemWorkId] = useState(defaultOrigemWorkId ?? "");
  const [items, setItems] = useState<StockTransferItemValues[]>([{ materialId: "", quantidade: 1, valorUnitario: 0 }]);
  const saldosOrigem = balances[origemWorkId || "geral"] ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="itensJson" value={JSON.stringify(items)} readOnly />

      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="destinoWorkId">Destino</Label>
          <NativeSelect id="destinoWorkId" name="destinoWorkId" defaultValue="">
            <option value="">Estoque Geral</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.codigo} — {work.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="motivo">Motivo / observação</Label>
          <Input id="motivo" name="motivo" placeholder="Ex: Remanejamento entre obras" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Itens a transferir</Label>
        <StockTransferItemsEditor items={items} onChange={setItems} materials={materials} saldosOrigem={saldosOrigem} />
        <p className="text-xs text-muted-foreground">
          O custo dos itens transferidos (quantidade × valor unitário) é atribuído à obra de destino.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Registrar transferência"}
        </Button>
      </div>
    </form>
  );
}
