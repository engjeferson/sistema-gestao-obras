"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { importPlanningBulk } from "@/server/actions/planejamento";
import { flattenStageOptions } from "@/components/planejamento/add-stage-form";
import { COST_TYPE_LABELS } from "@/lib/status-labels";
import type { ParsedBulkRow as BulkRow, ParsePlanilhaResult, TipoCusto } from "@/lib/planning-sheet-parser";
import { toDateInputValue, type PlainStage } from "@/components/planejamento/stage-list";

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

// Índices auxiliares pra numerar a coluna "#" em formato EAP (1, 1.1, 2, 2.1, 2.2...), igual ao
// código real salvo no banco — pra linha já existente usa o `codigo` real direto; pra linha nova
// do lote, calcula continuando a contagem a partir de quantos filhos aquele pai já tinha.
function buildCodigoIndex(stages: PlainStage[], map = new Map<string, string>()) {
  for (const stage of stages) {
    map.set(stage.id, stage.codigo);
    for (const task of stage.tasks) map.set(task.id, task.codigo);
    buildCodigoIndex(stage.children, map);
  }
  return map;
}

function buildExistingChildCount(stages: PlainStage[], map = new Map<string, number>()) {
  for (const stage of stages) {
    map.set(stage.id, stage.tasks.length + stage.children.length);
    buildExistingChildCount(stage.children, map);
  }
  return map;
}

function computeRowCodes(rows: BulkRow[], stages: PlainStage[]): Map<string, string> {
  const codigoById = buildCodigoIndex(stages);
  const existingChildCount = buildExistingChildCount(stages);
  const codeByClientId = new Map<string, string>();
  const newCountByParent = new Map<string, number>();

  function codeOfParent(parentClientId: string): string {
    if (!parentClientId) return "";
    if (parentClientId.startsWith(EXISTING_PREFIX)) return codigoById.get(parentClientId.slice(EXISTING_PREFIX.length)) ?? "";
    return codeByClientId.get(parentClientId) ?? "";
  }

  for (const row of rows) {
    if (row.clientId.startsWith(EXISTING_PREFIX)) {
      codeByClientId.set(row.clientId, codigoById.get(row.clientId.slice(EXISTING_PREFIX.length)) ?? "?");
      continue;
    }
    const parentKey = row.parentClientId || "__toplevel__";
    const baseCount = !row.parentClientId
      ? stages.length
      : row.parentClientId.startsWith(EXISTING_PREFIX)
        ? (existingChildCount.get(row.parentClientId.slice(EXISTING_PREFIX.length)) ?? 0)
        : 0;
    const alreadyNew = newCountByParent.get(parentKey) ?? 0;
    newCountByParent.set(parentKey, alreadyNew + 1);
    const prefix = codeOfParent(row.parentClientId);
    codeByClientId.set(row.clientId, prefix ? `${prefix}.${baseCount + alreadyNew + 1}` : `${baseCount + alreadyNew + 1}`);
  }

  return codeByClientId;
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

// Rascunho local das linhas NOVAS (as já existentes sempre recarregam frescas do servidor) — pra
// não perder o que foi digitado se a aba fechar/travar antes de clicar em "Salvar planejamento".
function draftKey(workId: string) {
  return `bulk-planning-draft:${workId}`;
}

function loadDraftRows(workId: string): BulkRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(draftKey(workId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BulkRow[]) : [];
  } catch {
    return [];
  }
}

function saveDraftRows(workId: string, rows: BulkRow[]) {
  try {
    if (rows.length === 0) {
      window.localStorage.removeItem(draftKey(workId));
    } else {
      window.localStorage.setItem(draftKey(workId), JSON.stringify(rows));
    }
  } catch {
    // localStorage indisponível (aba privada, quota etc.) — autosave vira no-op, sem quebrar a tela.
  }
}

// Etapas/atividades que a obra já tem lançado entram como linhas travadas (não editáveis aqui —
// o "Lançamento em bloco" só CRIA itens novos) no topo da própria tabela, em vez de um resumo à
// parte: assim o que já existe fica visível junto do que está sendo montado, e uma atividade nova
// pode escolher uma já existente como predecessora (antes só dava pra encadear dentro do lote).
function buildExistingRows(stages: PlainStage[], parentClientId = ""): BulkRow[] {
  const rows: BulkRow[] = [];
  for (const stage of stages) {
    const stageClientId = `${EXISTING_PREFIX}${stage.id}`;
    rows.push({
      clientId: stageClientId,
      tipo: "ETAPA",
      parentClientId,
      nome: stage.nome,
      dataInicioPrevista: stage.dataInicioPrevista ? toDateInputValue(stage.dataInicioPrevista) : "",
      dataFimPrevista: stage.dataFimPrevista ? toDateInputValue(stage.dataFimPrevista) : "",
      predecessorClientIds: [],
      custoPrevisto: "",
      tipoCusto: undefined,
    });
    for (const task of stage.tasks) {
      rows.push({
        clientId: `${EXISTING_PREFIX}${task.id}`,
        tipo: "ATIVIDADE",
        parentClientId: stageClientId,
        nome: task.nome,
        dataInicioPrevista: toDateInputValue(task.dataInicioPrevista),
        dataFimPrevista: toDateInputValue(task.dataFimPrevista),
        predecessorClientIds: task.predecessorChips
          .filter((c) => c.type === "task")
          .map((c) => `${EXISTING_PREFIX}${c.id}`),
        custoPrevisto: "",
        tipoCusto: undefined,
      });
    }
    rows.push(...buildExistingRows(stage.children, stageClientId));
  }
  return rows;
}

export function BulkPlanningEditor({ workId, stages }: { workId: string; stages: PlainStage[] }) {
  const [errorMessage, formAction, isPending] = useActionState(importPlanningBulk, undefined);
  const [rows, setRows] = useState<BulkRow[]>(() => {
    const existing = buildExistingRows(stages);
    return existing.length > 0 ? existing : [newRow("ETAPA")];
  });
  const [draftRestored, setDraftRestored] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [predecessorDraft, setPredecessorDraft] = useState<{ clientId: string; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftAppliedRef = useRef(false);

  const isExisting = (clientId: string) => clientId.startsWith(EXISTING_PREFIX);
  const etapaRows = rows.filter((r) => r.tipo === "ETAPA");
  const atividadeRows = rows.filter((r) => r.tipo === "ATIVIDADE");

  // Lê o rascunho só depois de hidratar (nunca no useState inicial) — ler localStorage direto no
  // initializer faria o primeiro render do cliente divergir do HTML vindo do servidor. O ref evita
  // aplicar o rascunho duas vezes (React chama efeitos duas vezes em dev/StrictMode).
  useEffect(() => {
    if (draftAppliedRef.current) return;
    draftAppliedRef.current = true;
    const draft = loadDraftRows(workId);
    if (draft.length === 0) return;
    setRows((prev) => [...prev, ...draft]);
    setDraftRestored(true);
  }, [workId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraftRows(workId, rows.filter((r) => !isExisting(r.clientId)));
    }, 500);
    return () => clearTimeout(timer);
  }, [rows, workId]);

  useEffect(() => {
    if (errorMessage) {
      saveDraftRows(workId, rows.filter((r) => !isExisting(r.clientId)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só precisa reagir quando o erro aparece
  }, [errorMessage]);

  const existingOptions = flattenStageOptions(stages).map((o) => ({
    value: `${EXISTING_PREFIX}${o.id}`,
    label: o.label,
  }));
  const depthMap = existingDepthMap(stages);

  function parentOptionsFor(excludeClientId?: string) {
    const batchOptions = etapaRows
      .filter((r) => r.clientId !== excludeClientId && !isExisting(r.clientId))
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
    if (isExisting(clientId)) return;
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
    const hasContent = rows.some((r) => !isExisting(r.clientId) && r.nome.trim() !== "");
    if (hasContent && !confirm("Importar a planilha vai substituir as linhas novas desta tela. Continuar?")) {
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
      // Mantém as linhas já existentes (travadas) na tela — a planilha só substitui o que era novo.
      setRows((prev) => [...prev.filter((r) => isExisting(r.clientId)), ...result.rows]);
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
  const rowCode = computeRowCodes(rows, stages);

  // Predecessoras são digitadas como código(s) de item separados por vírgula (ex: "1.1, 2.3") —
  // mesmo código da coluna "#" — em vez de um multi-select. Resolvido pro clientId real só ao
  // perder o foco, pra não reformatar o texto (e mexer no cursor) a cada tecla digitada.
  function predecessorDisplayText(row: BulkRow) {
    return row.predecessorClientIds
      .map((id) => rowCode.get(id))
      .filter((c): c is string => !!c)
      .join(", ");
  }

  function commitPredecessorText(row: BulkRow, text: string) {
    const ids = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((code) => atividadeRows.find((a) => a.clientId !== row.clientId && rowCode.get(a.clientId) === code)?.clientId)
      .filter((id): id is string => !!id);
    updateRow(row.clientId, { predecessorClientIds: [...new Set(ids)] });
  }

  return (
    <form
      action={formAction}
      onSubmit={() => saveDraftRows(workId, [])}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} readOnly />

      {draftRestored ? (
        <p className="text-xs text-muted-foreground">
          Rascunho anterior restaurado — as linhas novas que você ainda não tinha salvo continuam aqui.
        </p>
      ) : null}

      {rows.some((r) => isExisting(r.clientId)) ? (
        <p className="text-xs text-muted-foreground">
          As linhas destacadas abaixo já estão lançadas nesta obra (não são editáveis aqui) — use-as como
          predecessora das atividades novas. O que você adicionar entra como novas etapas/atividades.
        </p>
      ) : null}

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
            {rows.map((row) => {
              const locked = isExisting(row.clientId);
              return (
                <tr key={row.clientId} className={`border-b last:border-0 ${locked ? "bg-muted/30" : ""}`}>
                  <td className="p-2 text-muted-foreground">{rowCode.get(row.clientId)}</td>
                  <td className="p-2">
                    <RowTypeBadge tipo={row.tipo} />
                    {locked ? <span className="ml-1 text-[0.65rem] text-muted-foreground">já existe</span> : null}
                  </td>
                  <td className="p-2">
                    <NativeSelect
                      value={row.parentClientId}
                      onChange={(e) => updateRow(row.clientId, { parentClientId: e.target.value })}
                      className="min-w-[180px]"
                      disabled={locked}
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
                      disabled={locked}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="date"
                      value={row.dataInicioPrevista}
                      onChange={(e) => updateRow(row.clientId, { dataInicioPrevista: e.target.value })}
                      disabled={locked}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="date"
                      value={row.dataFimPrevista}
                      onChange={(e) => updateRow(row.clientId, { dataFimPrevista: e.target.value })}
                      disabled={locked}
                    />
                  </td>
                  <td className="p-2">
                    {row.tipo === "ATIVIDADE" ? (
                      <Input
                        type="text"
                        value={
                          predecessorDraft?.clientId === row.clientId
                            ? predecessorDraft.text
                            : predecessorDisplayText(row)
                        }
                        onFocus={() => setPredecessorDraft({ clientId: row.clientId, text: predecessorDisplayText(row) })}
                        onChange={(e) => setPredecessorDraft({ clientId: row.clientId, text: e.target.value })}
                        onBlur={(e) => {
                          commitPredecessorText(row, e.target.value);
                          setPredecessorDraft(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        placeholder="Ex: 1.1, 2.3"
                        className="w-24"
                        disabled={locked}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">
                    {!locked ? (
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
                    {!locked ? (
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
                    {!locked ? (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.clientId)}>
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
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
