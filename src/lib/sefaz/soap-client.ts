import https from "https";
import { loadSefazCert } from "@/lib/sefaz/cert";

const SOAP_ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";

const ENDPOINTS = {
  producao: "www1.nfe.fazenda.gov.br",
  homologacao: "hom1.nfe.fazenda.gov.br",
};

function getAmbienteHost() {
  return process.env.SEFAZ_AMBIENTE === "2" ? ENDPOINTS.homologacao : ENDPOINTS.producao;
}

/**
 * Envia o envelope SOAP 1.2 pro webservice NFeDistribuicaoDFe, autenticando
 * via mTLS com o certificado A1 configurado. Consulta pura (não assina o XML
 * — os serviços de consulta da SEFAZ autenticam só pelo certificado no
 * transporte, diferente dos serviços que emitem/alteram documento fiscal).
 */
export function callDistDFeInt(distDFeIntXml: string): Promise<string> {
  const { pfx, passphrase } = loadSefazCert();

  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>${distDFeIntXml}</nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;

  const body = Buffer.from(envelope, "utf-8");

  const options: https.RequestOptions = {
    hostname: getAmbienteHost(),
    path: "/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
    method: "POST",
    pfx,
    passphrase,
    headers: {
      "Content-Type": `application/soap+xml; charset=utf-8; action="${SOAP_ACTION}"`,
      "Content-Length": body.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`SEFAZ respondeu ${res.statusCode}: ${responseBody.slice(0, 500)}`));
          return;
        }
        resolve(responseBody);
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
