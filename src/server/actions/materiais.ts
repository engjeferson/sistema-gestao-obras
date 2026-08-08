"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { materialFormSchema } from "@/lib/validations/materiais";

export async function listMaterials() {
  return prisma.material.findMany({ orderBy: { nome: "asc" } });
}

export async function listActiveMaterials() {
  return prisma.material.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}

export async function getMaterial(materialId: string) {
  return prisma.material.findUnique({ where: { id: materialId } });
}

function parseMaterialForm(formData: FormData) {
  return materialFormSchema.safeParse({
    nome: formData.get("nome"),
    unidadePadrao: formData.get("unidadePadrao") ?? "",
    categoria: formData.get("categoria") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
  });
}

export async function createMaterial(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseMaterialForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const existing = await prisma.material.findUnique({ where: { nome: data.nome } });
  if (existing) {
    return "Já existe um material com esse nome.";
  }

  await prisma.material.create({
    data: {
      nome: data.nome,
      unidadePadrao: data.unidadePadrao,
      categoria: data.categoria || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/materiais");
  redirect("/cadastros/materiais");
}

export async function updateMaterial(materialId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseMaterialForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.material.update({
    where: { id: materialId },
    data: {
      nome: data.nome,
      unidadePadrao: data.unidadePadrao,
      categoria: data.categoria || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/materiais");
  redirect("/cadastros/materiais");
}

export async function toggleMaterialActive(materialId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.material.update({ where: { id: materialId }, data: { ativo } });
  revalidatePath("/cadastros/materiais");
}
