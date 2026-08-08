"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { importPlanningBulk } from "@/server/actions/planejamento";

type BulkRow = {
  clientId: string;
  tipo: "ETAPA" | "ATIVIDADE";
  parentClientId: string;
  codigo: string;
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
    codigo: "",
    nome: "",
    dataInicioPrevista: "",
    dataFimPrevista: "",
    predecessorClientIds: [],
  };
}

export function BulkPlanningEditor({ workId }: { workId: string }) {
  const [errorMessage, formAction, isPending] = useActionState(importPlanningBulk, undefined);
  const [rows, setRows] = useState<BulkRow[]>([newRow("ETAPA")]);

  const etapaRows = rows.filter((r) => r.tipo === "ETAPA");
  const atividadeRows = rows.filter((r) => r.tipo === "ATIVIDADE");

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
    setRows((prev) => [...prev, newRow("ATIVIDADE", etapaRows[0]?.clientId ?? "")]);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} readOnly />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Tipo</th>
              <th className="p-2">Etapa</th>
              <th className="p-2">Código</th>
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
                  {row.tipo === "ATIVIDADE" ? (
                    <NativeSelect
                      value={row.parentClientId}
                      onChange={(e) => updateRow(row.clientId, { parentClientId: e.target.value })}
                      className="min-w-[160px]"
                    >
                      <option value="" disabled>
                        Selecione a etapa
                      </option>
                      {etapaRows.map((etapa) => (
                        <option key={etapa.clientId} value={etapa.clientId}>
                          {etapa.nome || "(sem nome)"}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  <Input
                    value={row.codigo}
                    onChange={(e) => updateRow(row.clientId, { codigo: e.target.value })}
                    placeholder="auto"
                    className="w-20"
                  />
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
        <Button type="button" variant="outline" size="sm" onClick={addAtividade} disabled={etapaRows.length === 0}>
          <Plus /> Atividade
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
      {tipo === "ETAPA" ? "Etapa" : "Atividade"}
    </span>
  );
}
