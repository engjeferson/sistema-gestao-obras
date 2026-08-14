import { gunzipSync } from "zlib";
import { callDistDFeInt } from "@/lib/sefaz/soap-client";
import { getUfCode } from "@/lib/sefaz/uf-codes";

export type DocZip = { nsu: string; schema: string; xml: string };

export type RetDistDFe = {
  cStat: string;
  xMotivo: string;
  ultNSU: string | null;
  maxNSU: string | null;
  docs: DocZip[];
};

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return match ? match[1] : null;
}

function ambienteTpAmb() {
  return process.env.SEFAZ_AMBIENTE === "2" ? "2" : "1";
}

function parseRetorno(soapResponse: string): RetDistDFe {
  const retMatch = soapResponse.match(/<retDistDFeInt[^>]*>([\s\S]*?)<\/retDistDFeInt>/);
  const inner = retMatch ? retMatch[1] : soapResponse;

  const cStat = tag(inner, "cStat") ?? "";
  const xMotivo = tag(inner, "xMotivo") ?? "";
  const ultNSU = tag(inner, "ultNSU");
  const maxNSU = tag(inner, "maxNSU");

  const docs: DocZip[] = [];
  const docZipRegex = /<docZip NSU="(\d+)"(?:\s+schema="([^"]*)")?[^>]*>([^<]*)<\/docZip>/g;
  let match: RegExpExecArray | null;
  while ((match = docZipRegex.exec(inner))) {
    const [, nsu, schema, base64] = match;
    const xml = gunzipSync(Buffer.from(base64, "base64")).toString("utf-8");
    docs.push({ nsu, schema: schema ?? "", xml });
  }

  return { cStat, xMotivo, ultNSU, maxNSU, docs };
}

/**
 * Busca em lote os documentos novos a partir do NSU informado (000000000000000
 * pra trazer tudo desde o início). A SEFAZ devolve no máximo ~50 documentos
 * por chamada — quando ultNSU < maxNSU, tem mais pra buscar (chame de novo
 * com o ultNSU retornado).
 */
export async function buscarLoteDistribuicao(params: {
  cnpj: string;
  uf: string;
  ultNsu: string;
}): Promise<RetDistDFe> {
  const cnpjLimpo = params.cnpj.replace(/\D/g, "");
  const ultNsuPadded = params.ultNsu.padStart(15, "0");

  const distDFeInt = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.35"><tpAmb>${ambienteTpAmb()}</tpAmb><cUFAutor>${getUfCode(params.uf)}</cUFAutor><CNPJ>${cnpjLimpo}</CNPJ><distNSU><ultNSU>${ultNsuPadded}</ultNSU></distNSU></distDFeInt>`;

  const response = await callDistDFeInt(distDFeInt);
  return parseRetorno(response);
}

/**
 * Busca o XML completo (com itens) de uma NF-e específica pela chave de
 * acesso — necessário porque a busca em lote normalmente só traz o resumo
 * (resNFe), sem os itens.
 */
export async function buscarNFeCompletaPorChave(params: {
  cnpj: string;
  uf: string;
  chaveAcesso: string;
}): Promise<RetDistDFe> {
  const cnpjLimpo = params.cnpj.replace(/\D/g, "");

  const distDFeInt = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${ambienteTpAmb()}</tpAmb><cUFAutor>${getUfCode(params.uf)}</cUFAutor><CNPJ>${cnpjLimpo}</CNPJ><consChNFe><chNFe>${params.chaveAcesso}</chNFe></consChNFe></distDFeInt>`;

  const response = await callDistDFeInt(distDFeInt);
  return parseRetorno(response);
}
