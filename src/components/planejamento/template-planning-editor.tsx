"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { createPlanningTemplate } from "@/server/actions/planejamento-templates";

type TemplateRow = {
  clientId: string;
  tipo: "ETAPA" | "ATIVIDADE";
  parentClientId: string;
  codigo: string;
  nome: string;
  offsetInicioDias: string;
  duracaoDias: string;
  predecessorClientIds: string[];
};

function newRow(tipo: "ETAPA" | "ATIVIDADE", parentClientId = ""): TemplateRow {
  return {
    clientId: crypto.randomUUID(),
    tipo,
    parentClientId,
    codigo: "",
    nome: "",
    offsetInicioDias: "",
    duracaoDias: "",
    predecessorClientIds: [],
  };
}

export function TemplatePlanningEditor() {
  const [errorMessage, formAction, isPending] = useActionState(createPlanningTemplate, undefined);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [rows, setRows] = useState<TemplateRow[]>([newRow("ETAPA")]);

  const etapaRows = rows.filter((r) => r.tipo === "ETAPA");
  const atividadeRows = rows.filter((r) => r.tipo === "ATIVIDADE");

  function updateRow(clientId: string, patch: Partial<TemplateRow>) {
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

  const rowsPayload = rows.map((r) => ({
    ...r,
    offsetInicioDias: r.tipo === "ATIVIDADE" && r.offsetInicioDias !== "" ? Number(r.offsetInicioDias) : undefined,
    duracaoDias: r.tipo === "ATIVIDADE" && r.duracaoDias !== "" ? Number(r.duracaoDias) : undefined,
  }));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="nome" value={nome} readOnly />
      <input type="hidden" name="descricao" value={descricao} readOnly />
      <input type="hidden" name="rowsJson" value={JSON.stringify(rowsPayload)} readOnly />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nome do template</label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Casa térrea padrão" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Descrição (opcional)</label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={1} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Tipo</th>
              <th className="p-2">Etapa</th>
              <th className="p-2">Código</th>
              <th className="p-2">Nome</th>
              <th className="p-2">Dia início</th>
              <th className="p-2">Duração (dias)</th>
              <th className="p-2">Predecessoras</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.clientId} className="border-b last:border-0">
                <td className="p-2">
                  <RowTypeBadge tipo={row.tipo} />
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
                      type="number"
                      min={0}
                      value={row.offsetInicioDias}
                      onChange={(e) => updateRow(row.clientId, { offsetInicioDias: e.target.value })}
                      className="w-20"
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  {row.tipo === "ATIVIDADE" ? (
                    <Input
                      type="number"
                      min={1}
                      value={row.duracaoDias}
                      onChange={(e) => updateRow(row.clientId, { duracaoDias: e.target.value })}
                      className="w-20"
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
          {isPending ? "Salvando..." : "Salvar template"}
        </Button>
      </div>
    </form>
  );
}

function RowTypeBadge({ tipo }: { tipo: "ETAPA" | "ATIVIDADE" }) {
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
