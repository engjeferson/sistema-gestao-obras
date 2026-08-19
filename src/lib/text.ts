export function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Distância de edição (quantas inserções/remoções/trocas separam duas strings) — usada
// pra sugerir materiais parecidos quando fornecedores diferentes nomeiam o mesmo item
// de jeitos ligeiramente diferentes (ex: "Cimento CP-II 50kg" vs "CIMENTO CPII 50KG").
function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      currentRow[j] =
        a[i - 1] === b[j - 1]
          ? previousRow[j - 1]
          : 1 + Math.min(previousRow[j - 1], previousRow[j], currentRow[j - 1]);
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

/** 0 (nada a ver) a 1 (idêntico) — já espera strings normalizadas (normalizeSearch). */
export function textSimilarity(a: string, b: string) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

const SIMILARITY_THRESHOLD = 0.72;

/**
 * Acha, numa lista de materiais já cadastrados, o mais parecido com o nome digitado —
 * sem contar match exato (que já é tratado separadamente como "Cadastrado"). Usado tanto
 * na tabela de itens da nota quanto na revisão de itens importados de XML, pro mesmo
 * critério valer nos dois lugares.
 */
export function findSimilarMaterial<T extends { nome: string }>(
  nome: string,
  materials: T[],
  threshold = SIMILARITY_THRESHOLD,
): T | null {
  const normalized = normalizeSearch(nome);
  if (normalized.length < 3) return null;
  let best: { material: T; score: number } | null = null;
  for (const material of materials) {
    const materialNormalized = normalizeSearch(material.nome);
    if (materialNormalized === normalized) return null; // é exato, não é "parecido"
    const score = textSimilarity(normalized, materialNormalized);
    if (score >= threshold && (!best || score > best.score)) {
      best = { material, score };
    }
  }
  return best?.material ?? null;
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
