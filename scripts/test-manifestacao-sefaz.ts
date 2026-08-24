/**
 * Diagnóstico isolado de RecepcaoEvento4 (Manifestação do Destinatário).
 * NÃO depende da UI nem altera o fluxo normal do sistema — só testa,
 * lado a lado, diferentes combinações de endpoint/operação/versão SOAP
 * contra a MESMA nota, usando o certificado e a assinatura já existentes
 * (loadSefazCert, loadSefazCertPem, signInfEvento — reaproveitados, não
 * duplicados).
 *
 * Uso: npm run test:manifestacao-sefaz -- <chaveAcesso>
 */
import https from "https";
import { loadSefazCert, loadSefazCertPem } from "../src/lib/sefaz/cert";
import { signInfEvento } from "../src/lib/sefaz/xml-sign";

const CHAVE = process.argv[2];
const CNPJ_DESTINATARIO = "34553666000199";
const TP_EVENTO = "210210"; // Ciência da Operação — único tipo usado neste diagnóstico

if (!CHAVE) {
  console.error("Uso: npm run test:manifestacao-sefaz -- <chaveAcesso>");
  process.exit(1);
}

type Variante = {
  label: string;
  hostname: string;
  path: string;
  operacao: string; // nome do elemento raiz do Body e da operação SOAP
  soapAction: string;
  soapVersao: "1.1" | "1.2";
  comCabecMsg?: boolean; // testa incluir nfeCabecMsg (cUF+versaoDados) no Header, mesmo não declarado no WSDL
  bare?: boolean; // testa nfeDadosMsg direto no Body, sem o wrapper do nome da operação
  cOrgao?: string; // override do cOrgao — 91 (Ambiente Nacional) vs 43 (RS)
};

// Endpoints e nomes de operação extraídos AO VIVO dos respectivos WSDLs
// (?wsdl) de cada host — não presumidos. O Ambiente Nacional usa
// "nfeRecepcaoEventoNF"; RS e SVRS usam "nfeRecepcaoEvento" (sem "NF").
const VARIANTES: Variante[] = [
  {
    label: "Ambiente Nacional (AN) — SOAP 1.2",
    hostname: "www1.nfe.fazenda.gov.br",
    path: "/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    operacao: "nfeRecepcaoEventoNF",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEventoNF",
    soapVersao: "1.2",
  },
  {
    label: "Ambiente Nacional (AN) — SOAP 1.1",
    hostname: "www1.nfe.fazenda.gov.br",
    path: "/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    operacao: "nfeRecepcaoEventoNF",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEventoNF",
    soapVersao: "1.1",
  },
  {
    label: "SEFAZ-RS direto — SOAP 1.2",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.2",
  },
  {
    label: "SEFAZ-RS direto — SOAP 1.1",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.1",
  },
  {
    label: "SVRS — SOAP 1.2",
    hostname: "nfe.svrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.2",
  },
  {
    label: "SEFAZ-RS direto — SOAP 1.2 + nfeCabecMsg",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.2",
    comCabecMsg: true,
  },
  {
    label: "SEFAZ-RS direto — SOAP 1.1 + nfeCabecMsg",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.1",
    comCabecMsg: true,
  },
  {
    label: "SEFAZ-RS direto — SOAP 1.2 — BARE (sem wrapper)",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.2",
    bare: true,
  },
  {
    label: "SEFAZ-RS direto — SOAP 1.1 — BARE (sem wrapper)",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.1",
    bare: true,
  },
  {
    label: "SEFAZ-RS direto — BARE + cOrgao=43 (RS)",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.2",
    bare: true,
    cOrgao: "43",
  },
  {
    label: "SEFAZ-RS direto — BARE + cOrgao=91 (AN)",
    hostname: "nfe.sefazrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.2",
    bare: true,
    cOrgao: "91",
  },
  {
    label: "SVRS — BARE + cOrgao=43",
    hostname: "nfe.svrs.rs.gov.br",
    path: "/ws/recepcaoevento/recepcaoevento4.asmx",
    operacao: "nfeRecepcaoEvento",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
    soapVersao: "1.2",
    bare: true,
    cOrgao: "43",
  },
  {
    label: "AN — BARE + cOrgao=91 — SOAP 1.2",
    hostname: "www1.nfe.fazenda.gov.br",
    path: "/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    operacao: "nfeRecepcaoEventoNF",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEventoNF",
    soapVersao: "1.2",
    bare: true,
    cOrgao: "91",
  },
  {
    label: "AN — BARE + cOrgao=91 — SOAP 1.1",
    hostname: "www1.nfe.fazenda.gov.br",
    path: "/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    operacao: "nfeRecepcaoEventoNF",
    soapAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEventoNF",
    soapVersao: "1.1",
    bare: true,
    cOrgao: "91",
  },
];

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return match ? match[1] : null;
}

function extractSoapFaultReason(xml: string): string | null {
  const match = xml.match(/<(?:soap:Text|faultstring)[^>]*>([\s\S]*?)<\/(?:soap:Text|faultstring)>/);
  return match ? match[1].trim() : null;
}

function dhEventoAgora(): string {
  const brasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${brasilia.getUTCFullYear()}-${pad(brasilia.getUTCMonth() + 1)}-${pad(brasilia.getUTCDate())}T${pad(brasilia.getUTCHours())}:${pad(brasilia.getUTCMinutes())}:${pad(brasilia.getUTCSeconds())}-03:00`;
}

function montarEnvEventoAssinado(nSeqEvento: number, cOrgao: string): { envEvento: string; id: string } {
  const cnpj = CNPJ_DESTINATARIO.replace(/\D/g, "");
  const nSeqPad = String(nSeqEvento).padStart(2, "0");
  const id = `ID${TP_EVENTO}${CHAVE}${nSeqPad}`;
  const idLote = String(Date.now());

  const infEvento = `<infEvento Id="${id}"><cOrgao>${cOrgao}</cOrgao><tpAmb>1</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${CHAVE}</chNFe><dhEvento>${dhEventoAgora()}</dhEvento><tpEvento>${TP_EVENTO}</tpEvento><nSeqEvento>${nSeqEvento}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento>`;
  const evento = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">${infEvento}</evento>`;
  const eventoAssinado = signInfEvento(evento, id, loadSefazCertPem());
  const envEvento = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${idLote}</idLote>${eventoAssinado}</envEvento>`;
  return { envEvento, id };
}

// cUF do RS (código IBGE) — mesmo valor já usado em src/lib/sefaz/uf-codes.ts
const CUF_RS = "43";

function montarEnvelope(variante: Variante, envEvento: string): string {
  const header = variante.comCabecMsg
    ? `<nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4"><cUF>${CUF_RS}</cUF><versaoDados>4.00</versaoDados></nfeCabecMsg>`
    : "";

  const nfeDadosMsg = `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${envEvento}</nfeDadosMsg>`;
  const bodyContent = variante.bare
    ? nfeDadosMsg
    : `<${variante.operacao} xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4"><nfeDadosMsg>${envEvento}</nfeDadosMsg></${variante.operacao}>`;

  if (variante.soapVersao === "1.2") {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  ${header ? `<soap12:Header>${header}</soap12:Header>` : ""}
  <soap12:Body>
    ${bodyContent}
  </soap12:Body>
</soap12:Envelope>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  ${header ? `<soap:Header>${header}</soap:Header>` : ""}
  <soap:Body>
    ${bodyContent}
  </soap:Body>
</soap:Envelope>`;
}

type ResultadoVariante = {
  label: string;
  endpoint: string;
  soap: string;
  contentType: string;
  soapAction: string;
  httpStatus: number | string;
  cStatLote: string | null;
  xMotivoLote: string | null;
  cStat: string | null;
  xMotivo: string | null;
  fault: string | null;
};

function post(hostname: string, path_: string, headers: Record<string, string | number>, body: Buffer, pfx: Buffer, passphrase: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    // rejectUnauthorized:false só neste diagnóstico isolado — alguns hosts
    // estaduais da SEFAZ servem cadeia incompleta (falta intermediária),
    // que o Node rejeita por padrão mas navegadores toleram via AIA fetch.
    const req = https.request({ hostname, path: path_, method: "POST", pfx, passphrase, headers, rejectUnauthorized: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf-8") }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function testarVariante(variante: Variante, nSeqEvento: number): Promise<ResultadoVariante> {
  const { pfx, passphrase } = loadSefazCert();
  const { envEvento, id } = montarEnvEventoAssinado(nSeqEvento, variante.cOrgao ?? "91");
  const envelope = montarEnvelope(variante, envEvento);
  const body = Buffer.from(envelope, "utf-8");

  const contentType =
    variante.soapVersao === "1.2"
      ? `application/soap+xml; charset=utf-8; action="${variante.soapAction}"`
      : "text/xml; charset=utf-8";

  const headers: Record<string, string | number> =
    variante.soapVersao === "1.2"
      ? { "Content-Type": contentType, "Content-Length": body.length }
      : { "Content-Type": contentType, SOAPAction: `"${variante.soapAction}"`, "Content-Length": body.length };

  console.log(`\n--- ${variante.label} ---`);
  console.log(`Id do evento: ${id}`);
  console.log(`URL: https://${variante.hostname}${variante.path}`);
  console.log(`Headers enviados:`, headers);
  console.log(`Envelope SOAP completo enviado:\n${envelope}`);

  let httpStatus: number | string = "ERRO";
  let responseBody = "";
  try {
    const r = await post(variante.hostname, variante.path, headers, body, pfx, passphrase);
    httpStatus = r.status;
    responseBody = r.body;
  } catch (error) {
    responseBody = error instanceof Error ? error.message : String(error);
  }

  console.log(`HTTP Status: ${httpStatus}`);
  console.log(`Resposta crua:\n${responseBody}`);

  const loteMatch = responseBody.match(/<retEnvEvento[^>]*>([\s\S]*?)<retEvento/);
  const cStatLote = loteMatch ? tag(loteMatch[1], "cStat") : null;
  const xMotivoLote = loteMatch ? tag(loteMatch[1], "xMotivo") : null;
  const retEventoMatch = responseBody.match(/<retEvento[^>]*>([\s\S]*?)<\/retEvento>/);
  const infEventoRetorno = retEventoMatch ? retEventoMatch[1] : null;
  const cStat = infEventoRetorno ? tag(infEventoRetorno, "cStat") : null;
  const xMotivo = infEventoRetorno ? tag(infEventoRetorno, "xMotivo") : null;
  const fault = extractSoapFaultReason(responseBody);

  return {
    label: variante.label,
    endpoint: `${variante.hostname}${variante.path}`,
    soap: variante.soapVersao,
    contentType,
    soapAction: variante.soapAction,
    httpStatus,
    cStatLote,
    xMotivoLote,
    cStat,
    xMotivo,
    fault,
  };
}

async function main() {
  const filtro = process.argv[3]; // opcional: substring do label pra rodar só uma variante
  const variantesParaRodar = filtro ? VARIANTES.filter((v) => v.label.includes(filtro)) : VARIANTES;
  const resultados: ResultadoVariante[] = [];
  let nSeqEvento = 1;
  for (const variante of variantesParaRodar) {
    const resultado = await testarVariante(variante, nSeqEvento);
    resultados.push(resultado);
    // Se um evento já foi de fato REGISTRADO (cStat 135/136) numa variante,
    // as próximas reaproveitam o mesmo nSeqEvento — a SEFAZ deve responder
    // 573 (duplicidade) em vez de registrar de novo, o que é esperado e
    // tratado como sucesso na função real (enviarManifestacao).
    if (resultado.cStat === "135" || resultado.cStat === "136") {
      // não incrementa — próximas variantes devem ver duplicidade (573)
    }
  }

  console.log("\n\n=== TABELA COMPARATIVA ===");
  console.table(
    resultados.map((r) => ({
      Teste: r.label,
      Endpoint: r.endpoint,
      SOAP: r.soap,
      HTTP: r.httpStatus,
      "cStat(lote)": r.cStatLote ?? "-",
      "cStat(evento)": r.cStat ?? "-",
      "xMotivo/Fault": r.xMotivo ?? r.fault ?? (r.cStatLote ? r.xMotivoLote : "-"),
    })),
  );
}

main();
