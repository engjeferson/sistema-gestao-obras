"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";

export async function listProfessionalTypes() {
  return prisma.professionalType.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}

export async function listAllProfessionalTypes() {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);
  return prisma.professionalType.findMany({ orderBy: { nome: "asc" } });
}

export async function createProfessionalType(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) {
    return "Informe o nome do tipo.";
  }

  const existing = await prisma.professionalType.findUnique({ where: { nome } });
  if (existing) {
    return "Já existe um tipo com esse nome.";
  }

  await prisma.professionalType.create({ data: { nome } });
  revalidatePath("/configuracoes/tipos-profissional");
  return undefined;
}

export async function toggleProfessionalTypeActive(typeId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  await prisma.professionalType.update({ where: { id: typeId }, data: { ativo } });
  revalidatePath("/configuracoes/tipos-profissional");
}
