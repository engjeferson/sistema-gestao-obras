"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { importPlanningBulk } from "@/server/actions/planejamento";
import { flattenStageOptions } from "@/components/planejamento/add-stage-form";
import { COST_TYPE_LABELS, PLANNING_STATUS_BADGE, PLANNING_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";
import type { ParsedBulkRow as BulkRow, ParsePlanilhaResult, TipoCusto } from "@/lib/planning-sheet-parser";
import type { PlainStage } from "@/components/planejamento/stage-list";

const EXISTING_PREFIX = "existing:";

function newRow(tipo: "ETAPA" | "ATIVIDADE", parentClientId = ""): BulkRow {
  return {
    clientId: crypto.randomUUID(),
    tipo,
    parentClientId,
    nome: "",
    dataInicioPrevista: "",
    dataFimPrevista: "",
    predecessorClientIds: [],
    custoPrevisto: "",
    tipoCusto: undefined,
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

// Painel só de leitura mostrando o que a obra já tem lançado — o "Lançamento em bloco" só CRIA
// etapas/atividades novas (não edita as existentes), então sem isso a tela parece ter zerado o
// planejamento mesmo quando já existe bastante coisa cadastrada.
function ExistingPlanningReference({ stages }: { stages: PlainStage[] }) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma etapa cadastrada ainda nesta obra — o que você montar abaixo vai ser o início do planejamento.
      </p>
    );
  }
  return (
    <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto text-sm">
      {stages.map((stage) => (
        <ExistingStageNode key={stage.id} stage={stage} />
      ))}
    </ul>
  );
}

function ExistingStageNode({ stage }: { stage: PlainStage }) {
  return (
    <li>
      <p className="font-medium">{stage.nome}</p>
      {stage.tasks.length > 0 || stage.children.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-1 border-l pl-3">
          {stage.tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span className="text-foreground">{task.nome}</span>
              <span className="text-xs">
                {formatDateBR(task.dataInicioPrevista)} – {formatDateBR(task.dataFimPrevista)}
              </span>
              <Badge variant={PLANNING_STATUS_BADGE[task.status]} className="text-[0.65rem]">
                {PLANNING_STATUS_LABELS[task.status]}
              </Badge>
            </li>
          ))}
          {stage.children.map((child) => (
            <ExistingStageNode key={child.id} stage={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function BulkPlanningEditor({ workId, stages }: { workId: string; stages: PlainStage[] }) {
  const [errorMessage, formAction, isPending] = useActionState(importPlanningBulk, undefined);
  const [rows, setRows] = useState<BulkRow[]>([newRow("ETAPA")]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileSelected(file: File) {
    const hasContent = rows.some((r) => r.nome.trim() !== "");
    if (hasContent && !confirm("Importar a planilha vai substituir as linhas atuais desta tela. Continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsImporting(true);
    setImportSummary(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const response = await fetch("/api/planejamento/importar-planilha", { method: "POST", body: fd });
      const data = await response.json();
      if (!response.ok) {
        setImportSummary(data.error ?? "Não foi possível importar a planilha.");
        return;
      }
      const result = data as ParsePlanilhaResult;
      setRows(result.rows);
      setImportSummary(
        `${result.etapaCount} etapa(s) e ${result.atividadeCount} atividade(s) importadas de "${file.name}".` +
          (result.unresolved.length > 0 ? ` Avisos: ${result.unresolved.join("; ")}` : ""),
      );
    } catch {
      setImportSummary("Não foi possível importar a planilha. Tente novamente.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const canAddAtividade = existingOptions.length > 0 || etapaRows.length > 0;
  const rowNumber = new Map(rows.map((r, i) => [r.clientId, i + 1]));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} readOnly />

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Já planejado nesta obra</p>
        <p className="text-xs text-muted-foreground">
          O que você adicionar abaixo entra como novas etapas/atividades — isso aqui não muda o que já existe.
        </p>
        <ExistingPlanningReference stages={stages} />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Importar planilha</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<a href="/api/planejamento/modelo-importacao" download="modelo-lancamento-em-bloco.xlsx" />}
              nativeButton={false}
            >
              <Download /> Baixar planilha modelo
            </Button>
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <Upload /> {isImporting ? "Importando..." : "Importar planilha"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Preencha o modelo (colunas Item, Descrição, Predecessora, Data Início, Data Final, Tipo de Custo e Custo
          Previsto) e envie o arquivo .xlsx aqui.
        </p>
        {importSummary ? <p className="text-xs text-muted-foreground">{importSummary}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1300px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="w-10 p-2">#</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Pai</th>
              <th className="p-2">Nome</th>
              <th className="p-2">Início</th>
              <th className="p-2">Fim</th>
              <th className="p-2">Predecessoras</th>
              <th className="p-2">Tipo de custo</th>
              <th className="p-2">Custo previsto</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.clientId} className="border-b last:border-0">
                <td className="p-2 text-muted-foreground">{rowNumber.get(row.clientId)}</td>
                <td className="p-2">
                  <RowTypeBadge tipo={row.tipo} />
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
                            {rowNumber.get(a.clientId)}
                          </option>
                        ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  {row.tipo === "ATIVIDADE" ? (
                    <NativeSelect
                      value={row.tipoCusto ?? ""}
                      onChange={(e) => updateRow(row.clientId, { tipoCusto: (e.target.value || undefined) as TipoCusto | undefined })}
                      className="min-w-[140px]"
                    >
                      <option value="">—</option>
                      {Object.entries(COST_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  {row.tipo === "ATIVIDADE" ? (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.custoPrevisto}
                      onChange={(e) => updateRow(row.clientId, { custoPrevisto: e.target.value })}
                      placeholder="R$"
                      className="w-24"
                    />
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
        <Button type="button" variant="outline" size="sm" onClick={addAtividade} disabled={!canAddAtividade}>
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
