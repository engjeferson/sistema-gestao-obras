import https from "https";
import { loadSefazCert } from "@/lib/sefaz/cert";

const SOAP_ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";
const SOAP_ACTION_EVENTO = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEventoNF";

const ENDPOINTS = {
  producao: "www1.nfe.fazenda.gov.br",
  homologacao: "hom1.nfe.fazenda.gov.br",
};

function getAmbienteHost() {
  return process.env.SEFAZ_AMBIENTE === "2" ? ENDPOINTS.homologacao : ENDPOINTS.producao;
}

/**
 * Extrai só o texto legível de um fault SOAP (soap:Text ou faultstring),
 * em vez de propagar o envelope XML inteiro na mensagem de erro — o XML
 * cru é ruído pro usuário final, o texto do fault já diz o que importa.
 */
function extractSoapFaultReason(xml: string): string | null {
  const match = xml.match(/<(?:soap:Text|faultstring)[^>]*>([\s\S]*?)<\/(?:soap:Text|faultstring)>/);
  return match ? match[1].trim() : null;
}

function postSoap12(pathname: string, soapAction: string, body: string): Promise<string> {
  const { pfx, passphrase } = loadSefazCert();
  const buffer = Buffer.from(body, "utf-8");
  const hostname = getAmbienteHost();

  const options: https.RequestOptions = {
    hostname,
    path: pathname,
    method: "POST",
    pfx,
    passphrase,
    headers: {
      "Content-Type": `application/soap+xml; charset=utf-8; action="${soapAction}"`,
      "Content-Length": buffer.length,
    },
  };

  console.log(`[soap-client] POST https://${hostname}${pathname} (ambiente=${process.env.SEFAZ_AMBIENTE === "2" ? "homologação" : "produção"})`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString("utf-8");
        console.log(`[soap-client] HTTP ${res.statusCode} de https://${hostname}${pathname}`);
        if (res.statusCode && res.statusCode >= 400) {
          const reason = extractSoapFaultReason(responseBody);
          reject(new Error(reason ? `SEFAZ (${res.statusCode}): ${reason}` : `SEFAZ respondeu ${res.statusCode}: ${responseBody.slice(0, 200)}`));
          return;
        }
        resolve(responseBody);
      });
    });
    req.on("error", reject);
    req.write(buffer);
    req.end();
  });
}

/**
 * Envia o envelope SOAP 1.2 pro webservice NFeDistribuicaoDFe, autenticando
 * via mTLS com o certificado A1 configurado. Consulta pura (não assina o XML
 * — os serviços de consulta da SEFAZ autenticam só pelo certificado no
 * transporte, diferente dos serviços que emitem/alteram documento fiscal).
 */
export function callDistDFeInt(distDFeIntXml: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>${distDFeIntXml}</nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;

  return postSoap12("/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx", SOAP_ACTION, envelope);
}

/**
 * Envia um evento (ex.: Manifestação do Destinatário) já assinado
 * (XML-DSig) pro webservice nacional NFeRecepcaoEvento4. Diferente do
 * NFeDistribuicaoDFe, o `envEvento` precisa vir assinado — a autenticação
 * por mTLS sozinha não basta pra um serviço que altera o histórico da NF-e.
 *
 * O `nfeDadosMsg` vai DIRETO no Body ("bare"), sem envolver no nome da
 * operação — confirmado por diagnóstico isolado (scripts/test-manifestacao-
 * sefaz.ts) que o parser real da SEFAZ só lê o conteúdo (inclusive o
 * `idLote`) nesse formato; com o wrapper (`<nfeRecepcaoEventoNF>...`) o
 * servidor retornava erro genérico de servidor sem sequer processar o XML.
 */
export function callRecepcaoEvento(envEventoXmlAssinado: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${envEventoXmlAssinado}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

  return postSoap12("/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx", SOAP_ACTION_EVENTO, envelope);
}
