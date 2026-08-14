// Código IBGE da UF, exigido pela SEFAZ como "cUFAutor" (autor da consulta).
export const UF_CODES: Record<string, number> = {
  AC: 12,
  AL: 27,
  AP: 16,
  AM: 13,
  BA: 29,
  CE: 23,
  DF: 53,
  ES: 32,
  GO: 52,
  MA: 21,
  MT: 51,
  MS: 50,
  MG: 31,
  PA: 15,
  PB: 25,
  PR: 41,
  PE: 26,
  PI: 22,
  RJ: 33,
  RN: 24,
  RS: 43,
  RO: 11,
  RR: 14,
  SC: 42,
  SP: 35,
  SE: 28,
  TO: 17,
};

export function getUfCode(uf: string): number {
  const code = UF_CODES[uf.trim().toUpperCase()];
  if (!code) throw new Error(`UF inválida: ${uf}`);
  return code;
}
