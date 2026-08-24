import { readFileSync } from "fs";
import path from "path";
import forge from "node-forge";

export type SefazCert = {
  pfx: Buffer;
  passphrase: string;
};

export type SefazCertPem = {
  privateKeyPem: string;
  certPem: string;
};

/**
 * Carrega o certificado A1 (.pfx) configurado via env.
 * Prioriza SEFAZ_CERT_BASE64 (portátil, usado no deploy) e cai para
 * SEFAZ_CERT_PATH (arquivo local, conveniente em desenvolvimento).
 */
export function loadSefazCert(): SefazCert {
  const passphrase = process.env.SEFAZ_CERT_PASSWORD;
  if (!passphrase) {
    throw new Error("SEFAZ_CERT_PASSWORD não configurada.");
  }

  const base64 = process.env.SEFAZ_CERT_BASE64;
  if (base64) {
    return { pfx: Buffer.from(base64, "base64"), passphrase };
  }

  // Só usado em desenvolvimento local — no deploy (Vercel) usar SEFAZ_CERT_BASE64.
  const certPath = process.env.SEFAZ_CERT_PATH;
  if (certPath) {
    const resolved = path.isAbsolute(certPath)
      ? certPath
      : path.join(/* turbopackIgnore: true */ process.cwd(), certPath);
    return { pfx: readFileSync(resolved), passphrase };
  }

  throw new Error("Nenhum certificado configurado (SEFAZ_CERT_BASE64 ou SEFAZ_CERT_PATH).");
}

/**
 * Extrai a chave privada e o certificado do .pfx em formato PEM — necessário
 * pra assinar XML (XML-DSig), diferente do mTLS em `loadSefazCert` que usa o
 * .pfx direto. Node não expõe uma API simples pra isso, daí o node-forge.
 */
export function loadSefazCertPem(): SefazCertPem {
  const { pfx, passphrase } = loadSefazCert();

  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString("binary")));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];

  const keyBag = keyBags[0];
  const certBag = certBags[0];
  if (!keyBag?.key || !certBag?.cert) {
    throw new Error("Não foi possível extrair a chave privada ou o certificado do .pfx.");
  }

  return {
    privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
    certPem: forge.pki.certificateToPem(certBag.cert),
  };
}
