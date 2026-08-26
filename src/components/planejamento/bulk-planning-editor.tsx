"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { importPlanningBulk } from "@/server/actions/planejamento";
import { flattenStageOptions } from "@/components/planejamento/add-stage-form";
import { COST_TYPE_LABELS } from "@/lib/status-labels";
import type { PlainStage } from "@/components/planejamento/stage-list";

const EXISTING_PREFIX = "existing:";
type TipoCusto = "MATERIAL" | "MAO_DE_OBRA" | "SERVICO_TERCEIRIZADO" | "EQUIPAMENTO" | "TRANSPORTE" | "OUTROS";

type BulkRow = {
  clientId: string;
  tipo: "ETAPA" | "ATIVIDADE";
  parentClientId: string;
  nome: string;
  dataInicioPrevista: string;
  dataFimPrevista: string;
  predecessorClientIds: string[];
  custoPrevisto: string;
  tipoCusto: TipoCusto | undefined;
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

// --- Importar planilha colada (Item/Descrição/Predecessora/Data Início/Data Final/Tipo de
// Custo/Custo Previsto) --- mesmo parser (intercalação por código, resolução de predecessora com
// fallback pra última atividade da etapa) já usado no editor de templates, adaptado pra datas
// absolutas (esse import é pro cronograma real, não relativo a um dia 0) e pro custo previsto.

const ITEM_NUMBER_RE = /^\d+(\.\d+)*$/;

function splitPastedTable(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .filter((cols) => cols.some((c) => c !== ""));
}

function findColumnIndex(header: string[], keywords: string[]): number {
  return header.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k)));
}

function parseDateCell(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

function parseBRLNumber(raw: string): string {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return "";
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

function resolveTipoCusto(raw: string): TipoCusto | undefined {
  const norm = raw.trim().toLowerCase();
  if (!norm) return undefined;
  const entry = Object.entries(COST_TYPE_LABELS).find(([, label]) => label.toLowerCase() === norm);
  return entry?.[0] as TipoCusto | undefined;
}

function parsePlanilhaBulk(text: string): {
  rows: BulkRow[];
  etapaCount: number;
  atividadeCount: number;
  unresolved: string[];
} {
  const lines = splitPastedTable(text);
  if (lines.length === 0) return { rows: [], etapaCount: 0, atividadeCount: 0, unresolved: [] };

  let itemIdx = 0;
  let descIdx = 1;
  let predIdx = 2;
  let inicioIdx = 3;
  let fimIdx = 4;
  let tipoCustoIdx = 6;
  let custoIdx = 7;
  let dataLines = lines;

  if (!ITEM_NUMBER_RE.test(lines[0][0] ?? "")) {
    const header = lines[0];
    const foundItem = findColumnIndex(header, ["item"]);
    const foundDesc = findColumnIndex(header, ["descri"]);
    const foundPred = findColumnIndex(header, ["predecess"]);
    const foundInicio = findColumnIndex(header, ["data in", "início", "inicio"]);
    const foundFim = findColumnIndex(header, ["data fin", "término", "termino", "final"]);
    const foundTipoCusto = findColumnIndex(header, ["tipo de custo", "tipo custo"]);
    // "custo" sozinho bateria com "Tipo de Custo" também (é substring) — exige "previsto" junto.
    const foundCusto = findColumnIndex(header, ["custo previsto", "valor previsto"]);
    if (foundItem >= 0) itemIdx = foundItem;
    if (foundDesc >= 0) descIdx = foundDesc;
    if (foundPred >= 0) predIdx = foundPred;
    if (foundInicio >= 0) inicioIdx = foundInicio;
    if (foundFim >= 0) fimIdx = foundFim;
    if (foundTipoCusto >= 0) tipoCustoIdx = foundTipoCusto;
    if (foundCusto >= 0) custoIdx = foundCusto;
    dataLines = lines.slice(1);
  }

  type ParsedRow = {
    clientId: string;
    tipo: "ETAPA" | "ATIVIDADE";
    itemNumber: string;
    parentItemNumber: string;
    nome: string;
    dataInicioPrevista: string;
    dataFimPrevista: string;
    custoPrevisto: string;
    tipoCusto: TipoCusto | undefined;
    predecessorRefs: string[];
  };

  const parsed: ParsedRow[] = [];
  for (const cols of dataLines) {
    const itemNumber = (cols[itemIdx] ?? "").trim();
    if (!ITEM_NUMBER_RE.test(itemNumber)) continue;
    const isEtapa = !itemNumber.includes(".");
    const predRaw = (cols[predIdx] ?? "").trim();
    parsed.push({
      clientId: crypto.randomUUID(),
      tipo: isEtapa ? "ETAPA" : "ATIVIDADE",
      itemNumber,
      parentItemNumber: isEtapa ? "" : itemNumber.slice(0, itemNumber.lastIndexOf(".")),
      nome: (cols[descIdx] ?? "").trim(),
      dataInicioPrevista: isEtapa ? "" : parseDateCell(cols[inicioIdx] ?? ""),
      dataFimPrevista: isEtapa ? "" : parseDateCell(cols[fimIdx] ?? ""),
      custoPrevisto: isEtapa ? "" : parseBRLNumber(cols[custoIdx] ?? ""),
      tipoCusto: isEtapa ? undefined : resolveTipoCusto(cols[tipoCustoIdx] ?? ""),
      predecessorRefs: predRaw
        ? predRaw.split(/[,/;]/).map((r) => r.trim()).filter(Boolean)
        : [],
    });
  }

  const etapaClientIdByItem = new Map(parsed.filter((r) => r.tipo === "ETAPA").map((r) => [r.itemNumber, r.clientId]));
  const activityClientIdByItem = new Map(
    parsed.filter((r) => r.tipo === "ATIVIDADE").map((r) => [r.itemNumber, r.clientId]),
  );
  const lastActivityClientIdByEtapa = new Map<string, string>();
  const unresolved: string[] = [];
  const rows: BulkRow[] = [];
  let etapaCount = 0;
  let atividadeCount = 0;

  for (const r of parsed) {
    if (r.tipo === "ETAPA") {
      etapaCount += 1;
      rows.push({
        clientId: r.clientId,
        tipo: "ETAPA",
        parentClientId: "",
        nome: r.nome,
        dataInicioPrevista: "",
        dataFimPrevista: "",
        predecessorClientIds: [],
        custoPrevisto: "",
        tipoCusto: undefined,
      });
      continue;
    }

    atividadeCount += 1;
    const predecessorClientIds: string[] = [];
    for (const ref of r.predecessorRefs) {
      const directId = activityClientIdByItem.get(ref);
      if (directId && directId !== r.clientId) {
        predecessorClientIds.push(directId);
        continue;
      }
      const etapaLast = lastActivityClientIdByEtapa.get(ref);
      if (etapaLast) {
        predecessorClientIds.push(etapaLast);
        continue;
      }
      unresolved.push(`Item ${r.itemNumber}: predecessora "${ref}" não encontrada`);
    }
    lastActivityClientIdByEtapa.set(r.parentItemNumber, r.clientId);

    rows.push({
      clientId: r.clientId,
      tipo: "ATIVIDADE",
      parentClientId: etapaClientIdByItem.get(r.parentItemNumber) ?? "",
      nome: r.nome,
      dataInicioPrevista: r.dataInicioPrevista,
      dataFimPrevista: r.dataFimPrevista,
      predecessorClientIds,
      custoPrevisto: r.custoPrevisto,
      tipoCusto: r.tipoCusto,
    });
  }

  return { rows, etapaCount, atividadeCount, unresolved };
}

export function BulkPlanningEditor({ workId, stages }: { workId: string; stages: PlainStage[] }) {
  const [errorMessage, formAction, isPending] = useActionState(importPlanningBulk, undefined);
  const [rows, setRows] = useState<BulkRow[]>([newRow("ETAPA")]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSummary, setImportSummary] = useState<string | null>(null);

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

  function handleImport() {
    const hasContent = rows.some((r) => r.nome.trim() !== "");
    if (hasContent && !confirm("Importar a planilha vai substituir as linhas atuais desta tela. Continuar?")) {
      return;
    }
    const result = parsePlanilhaBulk(importText);
    if (result.rows.length === 0) {
      setImportSummary("Nenhuma linha reconhecida. Confira se colou as colunas Item, Descrição, Data Início e Data Final.");
      return;
    }
    setRows(result.rows);
    setImportText("");
    setImportOpen(false);
    setImportSummary(
      `${result.etapaCount} etapa(s) e ${result.atividadeCount} atividade(s) importadas.` +
        (result.unresolved.length > 0 ? ` Avisos: ${result.unresolved.join("; ")}` : ""),
    );
  }

  const canAddAtividade = existingOptions.length > 0 || etapaRows.length > 0;
  const rowNumber = new Map(rows.map((r, i) => [r.clientId, i + 1]));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} readOnly />

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImportOpen((v) => !v);
                setImportSummary(null);
              }}
            >
              <Upload /> {importOpen ? "Cancelar" : "Colar planilha"}
            </Button>
          </div>
        </div>
        {importOpen ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Copie as colunas Item, Descrição, Predecessora, Data Início, Data Final, Tipo de Custo e Custo
              Previsto da sua planilha (com cabeçalho) e cole abaixo.
            </p>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder="Cole aqui (Ctrl+V) o intervalo copiado do Excel/Sheets..."
              className="font-mono text-xs"
            />
            <div>
              <Button type="button" size="sm" onClick={handleImport} disabled={!importText.trim()}>
                Processar
              </Button>
            </div>
          </div>
        ) : null}
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
