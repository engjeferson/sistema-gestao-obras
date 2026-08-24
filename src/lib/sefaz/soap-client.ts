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

function postSoap12(pathname: string, soapAction: string, body: string): Promise<string> {
  const { pfx, passphrase } = loadSefazCert();
  const buffer = Buffer.from(body, "utf-8");

  const options: https.RequestOptions = {
    hostname: getAmbienteHost(),
    path: pathname,
    method: "POST",
    pfx,
    passphrase,
    headers: {
      "Content-Type": `application/soap+xml; charset=utf-8; action="${soapAction}"`,
      "Content-Length": buffer.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`SEFAZ respondeu ${res.statusCode}: ${responseBody.slice(0, 800)}`));
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
 * Confirmado via WSDL ao vivo que este serviço NÃO usa nfeCabecMsg (SOAP
 * header) — só o corpo, igual ao NFeDistribuicaoDFe.
 */
export function callRecepcaoEvento(envEventoXmlAssinado: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeRecepcaoEventoNF xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      <nfeDadosMsg>${envEventoXmlAssinado}</nfeDadosMsg>
    </nfeRecepcaoEventoNF>
  </soap12:Body>
</soap12:Envelope>`;

  return postSoap12("/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx", SOAP_ACTION_EVENTO, envelope);
}
