"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { StockTransferItemsEditor } from "@/components/estoque/stock-transfer-items-editor";
import { createStockTransferencia } from "@/server/actions/estoque";
import type { StockTransferItemValues } from "@/lib/validations/estoque";

type TaskOption = { id: string; codigo: string | null; nome: string };
type StageOption = { id: string; codigo: string | null; nome: string; tasks: TaskOption[] };

export function StockTransferenciaForm({
  materials,
  works,
  balances,
  stagesByWork,
  defaultOrigemWorkId,
}: {
  materials: { id: string; nome: string }[];
  works: { id: string; nome: string; codigo: string }[];
  balances: Record<string, Record<string, { saldo: number; custoMedio: number }>>;
  stagesByWork: Record<string, StageOption[]>;
  defaultOrigemWorkId?: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(createStockTransferencia, undefined);
  const [origemWorkId, setOrigemWorkId] = useState(defaultOrigemWorkId ?? "");
  const [destinoWorkId, setDestinoWorkId] = useState("");
  const [stageId, setStageId] = useState("");
  const [items, setItems] = useState<StockTransferItemValues[]>([{ materialId: "", quantidade: 0 }]);
  const saldosOrigem = balances[origemWorkId || "geral"] ?? {};
  const stagesForWork = stagesByWork[destinoWorkId] ?? [];
  const tasksForStage = stagesForWork.find((s) => s.id === stageId)?.tasks ?? [];

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
            <NativeSelect
              id="stageId"
              name="stageId"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              key={destinoWorkId}
            >
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
        {stageId && tasksForStage.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="taskId">Atividade</Label>
            <NativeSelect id="taskId" name="taskId" defaultValue="" key={stageId}>
              <option value="">—</option>
              {tasksForStage.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.codigo ? `${task.codigo} — ` : ""}
                  {task.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
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
          O custo transferido é o custo médio já registrado na origem — não é preciso informar valor de novo. Esse
          valor é atribuído à obra de destino.
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
