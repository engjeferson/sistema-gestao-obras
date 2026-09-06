"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { UF_CODES } from "@/lib/sefaz/uf-codes";
import { encryptCertificateForStorage, readCertificateInfo } from "@/lib/sefaz/cert";

const COMPANY_SELECT = {
  id: true,
  nome: true,
  cnpj: true,
  uf: true,
  endereco: true,
  telefone: true,
  logoUrl: true,
} as const;

export async function getCompanySettings() {
  const existing = await prisma.companySettings.findFirst({ select: COMPANY_SELECT });
  if (existing) return existing;
  return prisma.companySettings.create({ data: { nome: "Minha Empresa" }, select: COMPANY_SELECT });
}

export async function getCertificateStatus() {
  const company = await prisma.companySettings.findFirst({
    select: {
      certificadoArquivoNome: true,
      certificadoTitular: true,
      certificadoValidoAte: true,
      certificadoEnviadoEm: true,
      certificadoDados: true,
    },
  });

  const validoAte = company?.certificadoValidoAte ?? null;
  const diasParaExpirar = validoAte ? Math.ceil((validoAte.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return {
    hasCertificate: Boolean(company?.certificadoDados),
    arquivoNome: company?.certificadoArquivoNome ?? null,
    titular: company?.certificadoTitular ?? null,
    validoAte,
    diasParaExpirar,
    enviadoEm: company?.certificadoEnviadoEm ?? null,
  };
}

async function getOrCreateCompanyId() {
  const existing = await prisma.companySettings.findFirst({ select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.companySettings.create({ data: { nome: "Minha Empresa" }, select: { id: true } });
  return created.id;
}

export async function uploadCertificate(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const file = formData.get("certificado");
  const password = String(formData.get("senha") ?? "");
  if (!(file instanceof File) || file.size === 0) {
    return "Selecione o arquivo do certificado (.pfx ou .p12).";
  }
  if (!password) {
    return "Informe a senha do certificado.";
  }

  const pfxBuffer = Buffer.from(await file.arrayBuffer());

  let info: { subjectCommonName: string; validTo: Date };
  try {
    info = readCertificateInfo(pfxBuffer, password);
  } catch (error) {
    return error instanceof Error ? error.message : "Não foi possível ler o certificado.";
  }

  const companyId = await getOrCreateCompanyId();
  await prisma.companySettings.update({
    where: { id: companyId },
    data: {
      ...encryptCertificateForStorage(pfxBuffer, password),
      certificadoArquivoNome: file.name,
      certificadoTitular: info.subjectCommonName,
      certificadoValidoAte: info.validTo,
      certificadoEnviadoEm: new Date(),
    },
  });

  revalidatePath("/configuracoes/empresa");
  return undefined;
}

export async function removeCertificate() {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const companyId = await getOrCreateCompanyId();
  await prisma.companySettings.update({
    where: { id: companyId },
    data: {
      certificadoArquivoNome: null,
      certificadoTitular: null,
      certificadoValidoAte: null,
      certificadoEnviadoEm: null,
      certificadoDados: null,
      certificadoIv: null,
      certificadoAuthTag: null,
      certificadoSenha: null,
      certificadoSenhaIv: null,
      certificadoSenhaAuthTag: null,
    },
  });

  revalidatePath("/configuracoes/empresa");
}

export async function updateCompanySettings(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const uf = String(formData.get("uf") ?? "").trim().toUpperCase();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!nome) return "Informe o nome da empresa.";
  if (uf && !UF_CODES[uf]) return "UF inválida.";

  const existing = await prisma.companySettings.findFirst({ select: { id: true } });
  const data = {
    nome,
    cnpj: cnpj || null,
    uf: uf || null,
    endereco: endereco || null,
    telefone: telefone || null,
  };

  if (existing) {
    await prisma.companySettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.companySettings.create({ data });
  }

  revalidatePath("/configuracoes/empresa");
  return undefined;
}
