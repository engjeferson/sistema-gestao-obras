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

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
