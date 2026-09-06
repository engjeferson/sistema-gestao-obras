import { readFileSync } from "fs";
import path from "path";
import forge from "node-forge";
import { prisma } from "@/lib/prisma";
import { decryptBuffer, decryptText, encryptBuffer, encryptText } from "@/lib/secrets";

export type SefazCert = {
  pfx: Buffer;
  passphrase: string;
};

export type SefazCertPem = {
  privateKeyPem: string;
  certPem: string;
};

export type CertificateInfo = {
  subjectCommonName: string;
  validTo: Date;
};

/**
 * Valida um certificado A1 (.pfx/.p12) contra a senha informada e extrai
 * metadados de exibição. Lança erro amigável quando o arquivo não é um
 * PKCS#12 válido ou a senha não confere — dá feedback imediato no upload em
 * vez de uma falha confusa depois, quando o radar tentar autenticar na SEFAZ.
 */
export function readCertificateInfo(pfxBuffer: Buffer, password: string): CertificateInfo {
  let p12: forge.pkcs12.Pkcs12Pfx;

  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
  } catch {
    throw new Error("Não foi possível ler o certificado. Verifique se o arquivo (.pfx/.p12) e a senha estão corretos.");
  }

  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const cert = bags[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) {
    throw new Error("O arquivo enviado não contém um certificado válido.");
  }

  const commonNameField = cert.subject.getField("CN");
  return {
    subjectCommonName: commonNameField ? commonNameField.value : "Certificado sem nome",
    validTo: cert.validity.notAfter,
  };
}

/**
 * Carrega o certificado A1 (.pfx) configurado. Prioriza o certificado
 * cadastrado em Configurações > Empresa (criptografado no banco) e cai para
 * as variáveis de ambiente SEFAZ_CERT_BASE64/SEFAZ_CERT_PASSWORD só como
 * fallback — útil enquanto o certificado ainda não foi cadastrado pela UI.
 */
export async function loadSefazCert(): Promise<SefazCert> {
  const company = await prisma.companySettings.findFirst({
    where: { certificadoDados: { not: null } },
    select: {
      certificadoDados: true,
      certificadoIv: true,
      certificadoAuthTag: true,
      certificadoSenha: true,
      certificadoSenhaIv: true,
      certificadoSenhaAuthTag: true,
    },
  });

  if (
    company?.certificadoDados &&
    company.certificadoIv &&
    company.certificadoAuthTag &&
    company.certificadoSenha &&
    company.certificadoSenhaIv &&
    company.certificadoSenhaAuthTag
  ) {
    const pfx = decryptBuffer({
      data: Buffer.from(company.certificadoDados),
      iv: Buffer.from(company.certificadoIv),
      authTag: Buffer.from(company.certificadoAuthTag),
    });
    const passphrase = decryptText({
      data: Buffer.from(company.certificadoSenha),
      iv: Buffer.from(company.certificadoSenhaIv),
      authTag: Buffer.from(company.certificadoSenhaAuthTag),
    });
    return { pfx, passphrase };
  }

  const passphrase = process.env.SEFAZ_CERT_PASSWORD;
  if (!passphrase) {
    throw new Error("Nenhum certificado cadastrado. Cadastre o certificado digital em Configurações > Empresa.");
  }

  const base64 = process.env.SEFAZ_CERT_BASE64;
  if (base64) {
    return { pfx: Buffer.from(base64, "base64"), passphrase };
  }

  // Só usado em desenvolvimento local — no deploy, cadastre pela UI.
  const certPath = process.env.SEFAZ_CERT_PATH;
  if (certPath) {
    const resolved = path.isAbsolute(certPath)
      ? certPath
      : path.join(/* turbopackIgnore: true */ process.cwd(), certPath);
    return { pfx: readFileSync(resolved), passphrase };
  }

  throw new Error("Nenhum certificado cadastrado. Cadastre o certificado digital em Configurações > Empresa.");
}

/**
 * Extrai a chave privada e o certificado do .pfx em formato PEM — necessário
 * pra assinar XML (XML-DSig), diferente do mTLS em `loadSefazCert` que usa o
 * .pfx direto. Node não expõe uma API simples pra isso, daí o node-forge.
 */
export async function loadSefazCertPem(): Promise<SefazCertPem> {
  const { pfx, passphrase } = await loadSefazCert();

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

/**
 * Criptografa o .pfx e a senha (AES-256-GCM) para salvar em CompanySettings.
 */
export function encryptCertificateForStorage(pfxBuffer: Buffer, password: string) {
  const encryptedCert = encryptBuffer(pfxBuffer);
  const encryptedPassword = encryptText(password);
  return {
    certificadoDados: Uint8Array.from(encryptedCert.data),
    certificadoIv: Uint8Array.from(encryptedCert.iv),
    certificadoAuthTag: Uint8Array.from(encryptedCert.authTag),
    certificadoSenha: Uint8Array.from(encryptedPassword.data),
    certificadoSenhaIv: Uint8Array.from(encryptedPassword.iv),
    certificadoSenhaAuthTag: Uint8Array.from(encryptedPassword.authTag),
  };
}
