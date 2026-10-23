"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { StockSaidaItemsEditor } from "@/components/estoque/stock-saida-items-editor";
import { createStockSaida } from "@/server/actions/estoque";
import type { StockSaidaItemValues } from "@/lib/validations/estoque";

type TaskOption = { id: string; codigo: string | null; nome: string };
type StageOption = { id: string; codigo: string | null; nome: string; tasks: TaskOption[] };

export function StockSaidaForm({
  materials,
  works,
  balances,
  stagesByWork,
  defaultWorkId,
}: {
  materials: { id: string; nome: string; unidadePadrao: string | null }[];
  works: { id: string; nome: string; codigo: string }[];
  balances: Record<string, Record<string, { saldo: number; custoMedio: number }>>;
  stagesByWork: Record<string, StageOption[]>;
  defaultWorkId?: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(createStockSaida, undefined);
  const [origemWorkId, setOrigemWorkId] = useState(defaultWorkId ?? "");
  const [stageId, setStageId] = useState("");
  const [items, setItems] = useState<StockSaidaItemValues[]>([{ materialId: "", quantidade: 0 }]);
  const saldosOrigem = balances[origemWorkId || "geral"] ?? {};
  const stagesForWork = stagesByWork[origemWorkId] ?? [];
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
        {origemWorkId ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="stageId">Etapa</Label>
            <NativeSelect
              id="stageId"
              name="stageId"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              key={origemWorkId}
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
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="motivo">Motivo / observação</Label>
          <Input id="motivo" name="motivo" placeholder="Ex: Uso na obra, perda, descarte" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Material</Label>
        <StockSaidaItemsEditor items={items} onChange={setItems} materials={materials} saldosOrigem={saldosOrigem} />
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
