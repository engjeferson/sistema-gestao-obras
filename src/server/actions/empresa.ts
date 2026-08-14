"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { UF_CODES } from "@/lib/sefaz/uf-codes";

export async function getCompanySettings() {
  const existing = await prisma.companySettings.findFirst();
  if (existing) return existing;
  return prisma.companySettings.create({ data: { nome: "Minha Empresa" } });
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

  const existing = await prisma.companySettings.findFirst();
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
