export type ResNFeSummary = {
  chaveAcesso: string;
  emitenteCnpj: string | null;
  emitenteNome: string | null;
  numero: string;
  serie: string;
  dataEmissao: string | null;
  valorTotal: number | null;
  cancelada: boolean;
};

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return match ? match[1] : null;
}

/**
 * A chave de acesso (44 dígitos) já contém série e número da NF, então não
 * precisamos depender do resumo (resNFe) trazer esses campos separados.
 * Layout: UF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
 */
function extrairSerieNumero(chave: string) {
  const serie = chave.slice(22, 25).replace(/^0+/, "") || "0";
  const numero = chave.slice(25, 34).replace(/^0+/, "") || "0";
  return { serie, numero };
}

/**
 * Parseia um fragmento <resNFe>...</resNFe> vindo da distribuição DFe.
 * Só o resumo — sem itens (pra itens, buscar o XML completo por chave).
 */
export function parseResNFe(xml: string): ResNFeSummary | null {
  const chaveAcesso = tag(xml, "chNFe");
  if (!chaveAcesso) return null;

  const { serie, numero } = extrairSerieNumero(chaveAcesso);
  const vNF = tag(xml, "vNF");
  const cSitNFe = tag(xml, "cSitNFe");

  return {
    chaveAcesso,
    emitenteCnpj: tag(xml, "CNPJ"),
    emitenteNome: tag(xml, "xNome"),
    numero,
    serie,
    dataEmissao: tag(xml, "dhEmi")?.slice(0, 10) ?? null,
    valorTotal: vNF ? Number(vNF) : null,
    cancelada: cSitNFe === "2" || cSitNFe === "3",
  };
}

/**
 * Alguns documentos vêm completos (procNFe/nfeProc) já no lote da
 * distribuição, não só o resumo — mesmo assim extraímos um resumo
 * padronizado, mas guardamos o XML completo pra não precisar buscar de novo.
 */
export function parseProcNFeSummary(xml: string): ResNFeSummary | null {
  const idMatch = xml.match(/infNFe[^>]*\bId="NFe(\d{44})"/);
  const chaveAcesso = idMatch ? idMatch[1] : null;
  if (!chaveAcesso) return null;

  const { serie, numero } = extrairSerieNumero(chaveAcesso);
  const vNF = tag(xml, "vNF");

  return {
    chaveAcesso,
    emitenteCnpj: tag(xml, "CNPJ"),
    emitenteNome: tag(xml, "xNome"),
    numero,
    serie,
    dataEmissao: tag(xml, "dhEmi")?.slice(0, 10) ?? null,
    valorTotal: vNF ? Number(vNF) : null,
    cancelada: false,
  };
}
