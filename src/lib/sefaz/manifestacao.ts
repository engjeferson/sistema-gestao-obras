import { loadSefazCertPem } from "@/lib/sefaz/cert";
import { signInfEvento } from "@/lib/sefaz/xml-sign";
import { callRecepcaoEvento } from "@/lib/sefaz/soap-client";

// cOrgao=91 é o "Ambiente Nacional" — confirmado (documentação SEFAZ +
// exemplos ACBr) como o valor correto pro webservice nacional de eventos,
// independente da UF do destinatário.
const C_ORGAO_AMBIENTE_NACIONAL = "91";

export const TIPO_EVENTO_MANIFESTACAO = {
  CONFIRMACAO_OPERACAO: "210200",
  CIENCIA_OPERACAO: "210210",
  DESCONHECIMENTO_OPERACAO: "210220",
  OPERACAO_NAO_REALIZADA: "210240",
} as const;

const DESC_EVENTO: Record<string, string> = {
  "210200": "Confirmacao da Operacao",
  "210210": "Ciencia da Operacao",
  "210220": "Desconhecimento da Operacao",
  "210240": "Operacao nao Realizada",
};

export type ManifestacaoResultado =
  | { status: "registrado"; cStat: string; xMotivo: string; nProt: string | null }
  | { status: "duplicado"; cStat: string; xMotivo: string }
  | { status: "rejeitado"; cStat: string; xMotivo: string };

function ambienteTpAmb() {
  return process.env.SEFAZ_AMBIENTE === "2" ? "2" : "1";
}

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return match ? match[1] : null;
}

function dhEventoAgora(): string {
  // Horário de Brasília é sempre UTC-3 (sem horário de verão desde 2019) —
  // calcula direto a partir do UTC em vez de depender do fuso do servidor.
  const brasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = brasilia.getUTCFullYear();
  const m = pad(brasilia.getUTCMonth() + 1);
  const d = pad(brasilia.getUTCDate());
  const hh = pad(brasilia.getUTCHours());
  const mm = pad(brasilia.getUTCMinutes());
  const ss = pad(brasilia.getUTCSeconds());
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}-03:00`;
}

/**
 * Envia um evento de Manifestação do Destinatário (ex.: Ciência da
 * Operação) pra uma NF-e específica. Isso é o que sinaliza à SEFAZ que o
 * destinatário está ciente da nota, liberando a distribuição do XML
 * completo (com itens) via NFeDistribuicaoDFe — antes disso, notas recém
 * emitidas costumam ficar disponíveis só como resumo.
 */
export async function enviarManifestacao(params: {
  chaveAcesso: string;
  cnpjDestinatario: string;
  tpEvento: (typeof TIPO_EVENTO_MANIFESTACAO)[keyof typeof TIPO_EVENTO_MANIFESTACAO];
  nSeqEvento?: number;
}): Promise<ManifestacaoResultado> {
  const cnpj = params.cnpjDestinatario.replace(/\D/g, "");
  const nSeqEvento = params.nSeqEvento ?? 1;
  const nSeqEventoPad = String(nSeqEvento).padStart(2, "0");
  const id = `ID${params.tpEvento}${params.chaveAcesso}${nSeqEventoPad}`;
  const idLote = String(Date.now());
  const descEvento = DESC_EVENTO[params.tpEvento];

  const infEvento = `<infEvento Id="${id}"><cOrgao>${C_ORGAO_AMBIENTE_NACIONAL}</cOrgao><tpAmb>${ambienteTpAmb()}</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${params.chaveAcesso}</chNFe><dhEvento>${dhEventoAgora()}</dhEvento><tpEvento>${params.tpEvento}</tpEvento><nSeqEvento>${nSeqEvento}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>${descEvento}</descEvento></detEvento></infEvento>`;

  const evento = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">${infEvento}</evento>`;
  const eventoAssinado = signInfEvento(evento, id, loadSefazCertPem());

  const envEvento = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${idLote}</idLote>${eventoAssinado}</envEvento>`;

  const soapResponse = await callRecepcaoEvento(envEvento);

  const retEventoMatch = soapResponse.match(/<retEvento[^>]*>([\s\S]*?)<\/retEvento>/);
  const infEventoRetorno = retEventoMatch ? retEventoMatch[1] : soapResponse;

  const cStat = tag(infEventoRetorno, "cStat") ?? "";
  const xMotivo = tag(infEventoRetorno, "xMotivo") ?? "Sem retorno da SEFAZ.";
  const nProt = tag(infEventoRetorno, "nProt");

  if (cStat === "135" || cStat === "136") {
    return { status: "registrado", cStat, xMotivo, nProt };
  }
  if (cStat === "573") {
    return { status: "duplicado", cStat, xMotivo };
  }
  return { status: "rejeitado", cStat, xMotivo };
}
