import type { InvoiceItemValues } from "@/lib/validations/notas-fiscais";

export type ParsedNFe = {
  numero: string | null;
  dataEmissao: string | null;
  fornecedorNome: string | null;
  items: InvoiceItemValues[];
};

const UNIT_MAP: Record<string, InvoiceItemValues["unidade"]> = {
  UN: "UN",
  UND: "UN",
  UNID: "UN",
  UNIDADE: "UN",
  PC: "UN",
  PCT: "UN",
  PECA: "UN",
  CJ: "UN",
  PAR: "UN",
  ROL: "UN",
  KG: "KG",
  KGM: "KG",
  G: "KG",
  GR: "KG",
  M: "M",
  MT: "M",
  MTS: "M",
  M2: "M2",
  M3: "M3",
  CX: "CAIXA",
  CXA: "CAIXA",
  CAIXA: "CAIXA",
  SC: "SACO",
  SAC: "SACO",
  SACO: "SACO",
  L: "LITRO",
  LT: "LITRO",
  LITRO: "LITRO",
};

function mapUnidade(uCom: string | null): InvoiceItemValues["unidade"] {
  if (!uCom) return "UN";
  return UNIT_MAP[uCom.trim().toUpperCase()] ?? "UN";
}

function text(el: Element | null): string | null {
  const value = el?.textContent?.trim();
  return value ? value : null;
}

/**
 * NF-e (XML da nota fiscal eletrônica brasileira) usa namespace default,
 * mas getElementsByTagName casa pelo nome local independente disso.
 */
export function parseNFeXml(xmlText: string): ParsedNFe {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Arquivo XML inválido.");
  }

  const infNFe = doc.getElementsByTagName("infNFe")[0];
  if (!infNFe) {
    throw new Error("Este arquivo não parece ser o XML de uma NF-e.");
  }

  const ide = infNFe.getElementsByTagName("ide")[0] ?? null;
  const emit = infNFe.getElementsByTagName("emit")[0] ?? null;

  const numero = ide ? text(ide.getElementsByTagName("nNF")[0] ?? null) : null;
  const dhEmi = ide ? text(ide.getElementsByTagName("dhEmi")[0] ?? null) : null;
  const dEmi = ide ? text(ide.getElementsByTagName("dEmi")[0] ?? null) : null;
  const dataEmissao = (dhEmi ?? dEmi)?.slice(0, 10) ?? null;

  const fornecedorNome = emit ? text(emit.getElementsByTagName("xNome")[0] ?? null) : null;

  const items: InvoiceItemValues[] = Array.from(infNFe.getElementsByTagName("det")).map((det) => {
    const prod = det.getElementsByTagName("prod")[0] ?? null;
    const nome = text(prod?.getElementsByTagName("xProd")[0] ?? null) ?? "Produto sem nome";
    const uCom = text(prod?.getElementsByTagName("uCom")[0] ?? null);
    const qCom = Number(text(prod?.getElementsByTagName("qCom")[0] ?? null) ?? "1");
    const vUnCom = Number(text(prod?.getElementsByTagName("vUnCom")[0] ?? null) ?? "0");

    return {
      material: nome,
      quantidade: Number.isFinite(qCom) && qCom > 0 ? qCom : 1,
      unidade: mapUnidade(uCom),
      valorUnitario: Number.isFinite(vUnCom) ? vUnCom : 0,
    };
  });

  return { numero, dataEmissao, fornecedorNome, items };
}
