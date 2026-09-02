"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";

export async function listActiveUnits() {
  return prisma.unit.findMany({ where: { ativo: true }, orderBy: { sigla: "asc" } });
}

export async function listAllUnits() {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);
  return prisma.unit.findMany({ orderBy: { sigla: "asc" } });
}

export async function createUnit(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const sigla = String(formData.get("sigla") ?? "").trim();
  if (!sigla) {
    return "Informe a sigla da unidade.";
  }
  const nome = String(formData.get("nome") ?? "").trim();

  const existing = await prisma.unit.findUnique({ where: { sigla } });
  if (existing) {
    return "Já existe uma unidade com essa sigla.";
  }

  await prisma.unit.create({ data: { sigla, nome: nome || null } });
  revalidatePath("/configuracoes/unidades");
  return undefined;
}

export async function updateUnit(unitId: string, sigla: string, nome: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const trimmedSigla = sigla.trim();
  if (!trimmedSigla) {
    throw new Error("Informe a sigla da unidade.");
  }

  const existing = await prisma.unit.findUnique({ where: { sigla: trimmedSigla } });
  if (existing && existing.id !== unitId) {
    throw new Error("Já existe uma unidade com essa sigla.");
  }

  await prisma.unit.update({ where: { id: unitId }, data: { sigla: trimmedSigla, nome: nome.trim() || null } });
  revalidatePath("/configuracoes/unidades");
}

export async function toggleUnitActive(unitId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  await prisma.unit.update({ where: { id: unitId }, data: { ativo } });
  revalidatePath("/configuracoes/unidades");
}
