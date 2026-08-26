import { COST_TYPE_LABELS } from "@/lib/status-labels";

export type TipoCusto = "MATERIAL" | "MAO_DE_OBRA" | "SERVICO_TERCEIRIZADO" | "EQUIPAMENTO" | "TRANSPORTE" | "OUTROS";

export type ParsedBulkRow = {
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

export type ParsePlanilhaResult = {
  rows: ParsedBulkRow[];
  etapaCount: number;
  atividadeCount: number;
  unresolved: string[];
};

// Item/Descrição/Predecessora/Data Início/Data Final/Tipo de Custo/Custo Previsto — intercalação
// por código, resolução de predecessora com fallback pra última atividade da etapa. Usado tanto
// pra planilha colada (texto TSV, client-side) quanto pra arquivo .xlsx enviado (linhas já
// extraídas célula-a-célula, server-side) — ambos convergem pra `parsePlanilhaBulkRows`.

const ITEM_NUMBER_RE = /^\d+(\.\d+)*$/;

export function splitPastedTable(text: string): string[][] {
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

/** `lines` já vem como grade de células (uma linha da planilha = um array de strings). */
export function parsePlanilhaBulkRows(lines: string[][]): ParsePlanilhaResult {
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
  const rows: ParsedBulkRow[] = [];
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

export function parsePlanilhaBulkText(text: string): ParsePlanilhaResult {
  return parsePlanilhaBulkRows(splitPastedTable(text));
}
