"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createStockSaida } from "@/server/actions/estoque";

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
  const [materialId, setMaterialId] = useState("");
  const [stageId, setStageId] = useState("");
  const saldosLocal = balances[origemWorkId || "geral"] ?? {};
  const saldoAtual = saldosLocal[materialId]?.saldo ?? 0;
  const stagesForWork = stagesByWork[origemWorkId] ?? [];
  const tasksForStage = stagesForWork.find((s) => s.id === stageId)?.tasks ?? [];

  // Só lista materiais com saldo > 0 na origem selecionada — buscar entre os sem estoque ali não
  // ajuda em nada numa saída. Mantém o material já selecionado na lista mesmo que a origem mude
  // e ele zere, pra não sumir a seleção debaixo do usuário.
  const materiaisComSaldo = materials.filter((m) => (saldosLocal[m.id]?.saldo ?? 0) > 0);
  const materialOptions =
    materialId && !materiaisComSaldo.some((m) => m.id === materialId)
      ? [...materials.filter((m) => m.id === materialId), ...materiaisComSaldo]
      : materiaisComSaldo;

  return (
    <form action={formAction} className="flex flex-col gap-6">
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
          <Input id="motivo" name="motivo" placeholder="Ex: Uso na obra, perda, descarte" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Material</Label>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Material</th>
                <th className="p-2 font-medium">Saldo na origem</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-2">
                  <Combobox
                    value={materialId}
                    onChange={setMaterialId}
                    options={materialOptions.map((m) => ({ value: m.id, label: m.nome }))}
                    placeholder="Buscar material..."
                    emptyMessage="Nenhum material com saldo nesta origem."
                    className="min-w-[28rem]"
                  />
                </td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">
                  {materialId ? saldoAtual : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <input type="hidden" name="materialId" value={materialId} />

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Registrar saída"}
        </Button>
      </div>
    </form>
  );
}
