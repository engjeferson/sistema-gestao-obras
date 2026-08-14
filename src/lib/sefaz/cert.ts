import { readFileSync } from "fs";
import path from "path";

export type SefazCert = {
  pfx: Buffer;
  passphrase: string;
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
