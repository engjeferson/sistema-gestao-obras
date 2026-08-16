"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { importPlanningBulk } from "@/server/actions/planejamento";
import { flattenStageOptions } from "@/components/planejamento/add-stage-form";
import type { PlainStage } from "@/components/planejamento/stage-list";

const EXISTING_PREFIX = "existing:";

type BulkRow = {
  clientId: string;
  tipo: "ETAPA" | "ATIVIDADE";
  parentClientId: string;
  nome: string;
  dataInicioPrevista: string;
  dataFimPrevista: string;
  predecessorClientIds: string[];
};

function newRow(tipo: "ETAPA" | "ATIVIDADE", parentClientId = ""): BulkRow {
  return {
    clientId: crypto.randomUUID(),
    tipo,
    parentClientId,
    nome: "",
    dataInicioPrevista: "",
    dataFimPrevista: "",
    predecessorClientIds: [],
  };
}

function existingDepthMap(stages: PlainStage[], depth = 0, map = new Map<string, number>()) {
  for (const stage of stages) {
    map.set(stage.id, depth);
    existingDepthMap(stage.children, depth + 1, map);
  }
  return map;
}

function batchEtapaDepth(row: BulkRow, etapaRows: BulkRow[], depthMap: Map<string, number>, guard = 0): number {
  if (!row.parentClientId || guard > etapaRows.length) return 0;
  if (row.parentClientId.startsWith(EXISTING_PREFIX)) {
    return (depthMap.get(row.parentClientId.slice(EXISTING_PREFIX.length)) ?? 0) + 1;
  }
  const parent = etapaRows.find((r) => r.clientId === row.parentClientId);
  if (!parent) return 0;
  return batchEtapaDepth(parent, etapaRows, depthMap, guard + 1) + 1;
}

export function BulkPlanningEditor({ workId, stages }: { workId: string; stages: PlainStage[] }) {
  const [errorMessage, formAction, isPending] = useActionState(importPlanningBulk, undefined);
  const [rows, setRows] = useState<BulkRow[]>([newRow("ETAPA")]);

  const etapaRows = rows.filter((r) => r.tipo === "ETAPA");
  const atividadeRows = rows.filter((r) => r.tipo === "ATIVIDADE");

  const existingOptions = flattenStageOptions(stages).map((o) => ({
    value: `${EXISTING_PREFIX}${o.id}`,
    label: o.label,
  }));
  const depthMap = existingDepthMap(stages);

  function parentOptionsFor(excludeClientId?: string) {
    const batchOptions = etapaRows
      .filter((r) => r.clientId !== excludeClientId)
      .map((r) => ({
        value: r.clientId,
        label: `${"— ".repeat(batchEtapaDepth(r, etapaRows, depthMap))}${r.nome || "(sem nome)"}`,
      }));
    return [...existingOptions, ...batchOptions];
  }

  function updateRow(clientId: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  }

  function removeRow(clientId: string) {
    setRows((prev) =>
      prev
        .filter((r) => r.clientId !== clientId)
        .map((r) => ({
          ...r,
          parentClientId: r.parentClientId === clientId ? "" : r.parentClientId,
          predecessorClientIds: r.predecessorClientIds.filter((id) => id !== clientId),
        })),
    );
  }

  function addEtapa() {
    setRows((prev) => [...prev, newRow("ETAPA")]);
  }

  function addAtividade() {
    const defaultParent = existingOptions[0]?.value ?? etapaRows[0]?.clientId ?? "";
    setRows((prev) => [...prev, newRow("ATIVIDADE", defaultParent)]);
  }

  const canAddItem = existingOptions.length > 0 || etapaRows.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} readOnly />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Tipo</th>
              <th className="p-2">Pai</th>
              <th className="p-2">Nome</th>
              <th className="p-2">Início</th>
              <th className="p-2">Fim</th>
              <th className="p-2">Predecessoras</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.clientId} className="border-b last:border-0">
                <td className="p-2">
                  <Badge tipo={row.tipo} />
                </td>
                <td className="p-2">
                  <NativeSelect
                    value={row.parentClientId}
                    onChange={(e) => updateRow(row.clientId, { parentClientId: e.target.value })}
                    className="min-w-[180px]"
                  >
                    {row.tipo === "ETAPA" ? <option value="">— Nível superior —</option> : null}
                    {row.tipo === "ATIVIDADE" ? (
                      <option value="" disabled>
                        Selecione a etapa
                      </option>
                    ) : null}
                    {parentOptionsFor(row.clientId).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td className="p-2">
                  <Input
                    value={row.nome}
                    onChange={(e) => updateRow(row.clientId, { nome: e.target.value })}
                    placeholder={row.tipo === "ETAPA" ? "Ex: Fundação" : "Ex: Escavação"}
                    className="min-w-[160px]"
                  />
                </td>
                <td className="p-2">
                  {row.tipo === "ATIVIDADE" ? (
                    <Input
                      type="date"
                      value={row.dataInicioPrevista}
                      onChange={(e) => updateRow(row.clientId, { dataInicioPrevista: e.target.value })}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  {row.tipo === "ATIVIDADE" ? (
                    <Input
                      type="date"
                      value={row.dataFimPrevista}
                      onChange={(e) => updateRow(row.clientId, { dataFimPrevista: e.target.value })}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  {row.tipo === "ATIVIDADE" ? (
                    <select
                      multiple
                      value={row.predecessorClientIds}
                      onChange={(e) =>
                        updateRow(row.clientId, {
                          predecessorClientIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                        })
                      }
                      className="h-16 min-w-[160px] rounded border bg-background px-1 text-xs"
                    >
                      {atividadeRows
                        .filter((a) => a.clientId !== row.clientId)
                        .map((a) => (
                          <option key={a.clientId} value={a.clientId}>
                            {a.nome || "(sem nome)"}
                          </option>
                        ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.clientId)}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addEtapa}>
          <Plus /> Etapa
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addAtividade} disabled={!canAddItem}>
          <Plus /> Item
        </Button>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar planejamento"}
        </Button>
      </div>
    </form>
  );
}

function Badge({ tipo }: { tipo: "ETAPA" | "ATIVIDADE" }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        tipo === "ETAPA" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {tipo === "ETAPA" ? "Etapa" : "Item"}
    </span>
  );
}
