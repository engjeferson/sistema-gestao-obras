import { SignedXml } from "xml-crypto";
import type { SefazCertPem } from "@/lib/sefaz/cert";

/**
 * Assina um elemento identificado por `id` dentro do `xml`, no padrão exigido
 * pela NFe (enveloped signature, C14N puro — não exclusive — SHA1/RSA-SHA1,
 * legado mas obrigatório pelo schema). Insere o `<Signature>` logo depois do
 * elemento assinado, como irmão dele (não dentro dele).
 */
export function signInfEvento(xml: string, id: string, cert: SefazCertPem): string {
  const sig = new SignedXml({
    privateKey: cert.privateKeyPem,
    publicCert: cert.certPem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });

  sig.addReference({
    xpath: `//*[@Id='${id}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });

  sig.computeSignature(xml, {
    location: { reference: `//*[@Id='${id}']`, action: "after" },
  });

  return sig.getSignedXml();
}
