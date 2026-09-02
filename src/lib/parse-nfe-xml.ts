import type { InvoiceItemValues } from "@/lib/validations/notas-fiscais";

export type ParsedNFeDuplicata = {
  vencimento: string;
  valor: number;
};

export type ParsedNFe = {
  numero: string | null;
  dataEmissao: string | null;
  fornecedorNome: string | null;
  items: InvoiceItemValues[];
  duplicatas: ParsedNFeDuplicata[];
  valorDesconto: number;
  valorFrete: number;
};

const UNIT_MAP: Record<string, string> = {
  UN: "un",
  UND: "un",
  UNID: "un",
  UNIDADE: "un",
  PC: "un",
  PCT: "un",
  PECA: "un",
  CJ: "un",
  PAR: "un",
  ROL: "un",
  KG: "kg",
  KGM: "kg",
  G: "kg",
  GR: "kg",
  M: "m",
  MT: "m",
  MTS: "m",
  M2: "m²",
  M3: "m³",
  CX: "caixa",
  CXA: "caixa",
  CAIXA: "caixa",
  SC: "saco",
  SAC: "saco",
  SACO: "saco",
  L: "litro",
  LT: "litro",
  LITRO: "litro",
};

function mapUnidade(uCom: string | null): string {
  if (!uCom) return "un";
  return UNIT_MAP[uCom.trim().toUpperCase()] ?? "un";
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

  const cobr = infNFe.getElementsByTagName("cobr")[0] ?? null;
  const duplicatas: ParsedNFeDuplicata[] = cobr
    ? Array.from(cobr.getElementsByTagName("dup"))
        .map((dup) => {
          const vencimento = text(dup.getElementsByTagName("dVenc")[0] ?? null);
          const valor = Number(text(dup.getElementsByTagName("vDup")[0] ?? null) ?? "0");
          return vencimento && Number.isFinite(valor) ? { vencimento, valor } : null;
        })
        .filter((d): d is ParsedNFeDuplicata => d !== null)
    : [];

  // <total><ICMSTot> traz o desconto e o frete já totalizados pelo emitente — evita o usuário ter
  // que calcular/digitar isso de novo quando a nota já vem com XML.
  const icmsTot = infNFe.getElementsByTagName("total")[0]?.getElementsByTagName("ICMSTot")[0] ?? null;
  const vDesc = Number(text(icmsTot?.getElementsByTagName("vDesc")[0] ?? null) ?? "0");
  const vFrete = Number(text(icmsTot?.getElementsByTagName("vFrete")[0] ?? null) ?? "0");

  return {
    numero,
    dataEmissao,
    fornecedorNome,
    items,
    duplicatas,
    valorDesconto: Number.isFinite(vDesc) ? vDesc : 0,
    valorFrete: Number.isFinite(vFrete) ? vFrete : 0,
  };
}
