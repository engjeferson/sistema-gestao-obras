"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { PredecessorPicker } from "@/components/planejamento/predecessor-picker";
import { createPlanningTemplate } from "@/server/actions/planejamento-templates";

export type TemplateRow = {
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

/**
 * Planilha colada (TAB entre colunas, quebra de linha entre linhas) -> TemplateRow[].
 * Layout padrão do usuário: Item, Descrição, Predecessora, Data Início, Data Final, Duração, Custo, Total —
 * usado como fallback quando o cabeçalho colado não é reconhecido.
 * Dia de início de cada atividade é calculado (não colado): offset = 0 sem predecessora,
 * ou max(offset + duração) das predecessoras, mesma convenção de applyPlanningTemplate.
 */
function parsePlanilha(text: string): {
  rows: TemplateRow[];
  etapaCount: number;
  atividadeCount: number;
  unresolved: string[];
} {
  const lines = splitPastedTable(text);
  if (lines.length === 0) {
    return { rows: [], etapaCount: 0, atividadeCount: 0, unresolved: [] };
  }

  let itemIdx = 0;
  let descIdx = 1;
  let predIdx = 2;
  let duracaoIdx = 5;
  let dataLines = lines;

  if (!ITEM_NUMBER_RE.test(lines[0][0] ?? "")) {
    const header = lines[0];
    const foundItem = findColumnIndex(header, ["item"]);
    const foundDesc = findColumnIndex(header, ["descri"]);
    const foundPred = findColumnIndex(header, ["predecess"]);
    const foundDuracao = findColumnIndex(header, ["dura"]);
    if (foundItem >= 0) itemIdx = foundItem;
    if (foundDesc >= 0) descIdx = foundDesc;
    if (foundPred >= 0) predIdx = foundPred;
    if (foundDuracao >= 0) duracaoIdx = foundDuracao;
    dataLines = lines.slice(1);
  }

  type ParsedRow = {
    clientId: string;
    tipo: "ETAPA" | "ATIVIDADE";
    itemNumber: string;
    parentItemNumber: string;
    nome: string;
    duracaoDias: number;
    predecessorRefs: string[];
  };

  const parsed: ParsedRow[] = [];
  for (const cols of dataLines) {
    const itemNumber = (cols[itemIdx] ?? "").trim();
    if (!ITEM_NUMBER_RE.test(itemNumber)) continue;
    const nome = (cols[descIdx] ?? "").trim();
    const predRaw = (cols[predIdx] ?? "").trim();
    const duracaoRaw = (cols[duracaoIdx] ?? "").trim();
    const duracaoDias = Number(duracaoRaw.replace(",", ".")) || 1;
    const isEtapa = !itemNumber.includes(".");
    parsed.push({
      clientId: crypto.randomUUID(),
      tipo: isEtapa ? "ETAPA" : "ATIVIDADE",
      itemNumber,
      parentItemNumber: isEtapa ? "" : itemNumber.slice(0, itemNumber.lastIndexOf(".")),
      nome,
      duracaoDias,
      predecessorRefs: predRaw
        ? predRaw
            .split(/[,/;]/)
            .map((r) => r.trim())
            .filter(Boolean)
        : [],
    });
  }

  const etapaClientIdByItem = new Map(parsed.filter((r) => r.tipo === "ETAPA").map((r) => [r.itemNumber, r.clientId]));
  const activityClientIdByItem = new Map(
    parsed.filter((r) => r.tipo === "ATIVIDADE").map((r) => [r.itemNumber, r.clientId]),
  );
  const lastActivityClientIdByEtapa = new Map<string, string>();
  const offsetByClientId = new Map<string, number>();
  const durationByClientId = new Map<string, number>();
  const unresolved: string[] = [];
  const rows: TemplateRow[] = [];
  let etapaCount = 0;
  let atividadeCount = 0;

  for (const r of parsed) {
    if (r.tipo === "ETAPA") {
      etapaCount += 1;
      rows.push({
        clientId: r.clientId,
        tipo: "ETAPA",
        parentClientId: "",
        codigo: "",
        nome: r.nome,
        offsetInicioDias: "",
        duracaoDias: "",
        predecessorClientIds: [],
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
      const etapaLastActivity = lastActivityClientIdByEtapa.get(ref);
      if (etapaLastActivity) {
        predecessorClientIds.push(etapaLastActivity);
        continue;
      }
      unresolved.push(`Item ${r.itemNumber}: predecessora "${ref}" não encontrada`);
    }

    const offsetInicioDias = predecessorClientIds.length
      ? Math.max(...predecessorClientIds.map((id) => (offsetByClientId.get(id) ?? 0) + (durationByClientId.get(id) ?? 0)))
      : 0;
    offsetByClientId.set(r.clientId, offsetInicioDias);
    durationByClientId.set(r.clientId, r.duracaoDias);
    lastActivityClientIdByEtapa.set(r.parentItemNumber, r.clientId);

    rows.push({
      clientId: r.clientId,
      tipo: "ATIVIDADE",
      parentClientId: etapaClientIdByItem.get(r.parentItemNumber) ?? "",
      codigo: "",
      nome: r.nome,
      offsetInicioDias: String(offsetInicioDias),
      duracaoDias: String(r.duracaoDias),
      predecessorClientIds,
    });
  }

  return { rows, etapaCount, atividadeCount, unresolved };
}

export function TemplatePlanningEditor({
  action = createPlanningTemplate,
  submitLabel = "Salvar template",
  defaultNome = "",
  defaultDescricao = "",
  defaultRows,
}: {
  action?: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  submitLabel?: string;
  defaultNome?: string;
  defaultDescricao?: string;
  defaultRows?: TemplateRow[];
} = {}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [nome, setNome] = useState(defaultNome);
  const [descricao, setDescricao] = useState(defaultDescricao);
  const [rows, setRows] = useState<TemplateRow[]>(defaultRows ?? [newRow("ETAPA")]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSummary, setImportSummary] = useState<string | null>(null);

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
    setRows((prev) => [...prev, newRow("ATIVIDADE", etapaRows[etapaRows.length - 1]?.clientId ?? "")]);
  }

  function handleImport() {
    const hasContent = rows.some((r) => r.nome.trim() !== "");
    if (hasContent && !confirm("Importar a planilha vai substituir as linhas atuais da tabela. Continuar?")) {
      return;
    }
    const result = parsePlanilha(importText);
    if (result.rows.length === 0) {
      setImportSummary(
        "Nenhuma linha reconhecida. Confira se colou as colunas Item, Descrição, Predecessora e Duração.",
      );
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

      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Importar planilha</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<a href="/api/planejamento-templates/modelo" download="modelo-planejamento.xlsx" />}
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
              Copie as colunas Item, Descrição, Predecessora e Duração da sua planilha (com cabeçalho) e cole abaixo.
              O dia de início de cada atividade é calculado automaticamente a partir das predecessoras.
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
                    <PredecessorPicker
                      value={row.predecessorClientIds}
                      onChange={(predecessorClientIds) => updateRow(row.clientId, { predecessorClientIds })}
                      options={atividadeRows
                        .filter((a) => a.clientId !== row.clientId)
                        .map((a) => ({ value: a.clientId, label: a.nome || "(sem nome)" }))}
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
        <Button type="button" variant="outline" size="sm" onClick={addAtividade} disabled={etapaRows.length === 0}>
          <Plus /> Atividade
        </Button>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
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
