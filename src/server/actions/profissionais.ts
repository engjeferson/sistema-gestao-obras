"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { assertModuleWrite } from "@/server/actions/permissions";
import { professionalFormSchema } from "@/lib/validations/profissionais";

export async function listProfessionals() {
  return prisma.professional.findMany({ include: { tipo: true }, orderBy: { nome: "asc" } });
}

export async function listActiveProfessionals() {
  return prisma.professional.findMany({
    where: { ativo: true },
    include: { tipo: true },
    orderBy: { nome: "asc" },
  });
}

export async function getProfessional(professionalId: string) {
  return prisma.professional.findUnique({ where: { id: professionalId }, include: { tipo: true } });
}

function parseProfessionalForm(formData: FormData) {
  return professionalFormSchema.safeParse({
    nome: formData.get("nome"),
    tipoId: formData.get("tipoId"),
    telefone: formData.get("telefone") ?? undefined,
    documento: formData.get("documento") ?? undefined,
    email: formData.get("email") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
  });
}

export async function createProfessional(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  const parsed = parseProfessionalForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.professional.create({
    data: {
      nome: data.nome,
      tipoId: data.tipoId,
      telefone: data.telefone || null,
      documento: data.documento || null,
      email: data.email || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/profissionais");
  redirect("/cadastros/profissionais");
}

export async function updateProfessional(
  professionalId: string,
  _prevState: string | undefined,
  formData: FormData,
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  const parsed = parseProfessionalForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      nome: data.nome,
      tipoId: data.tipoId,
      telefone: data.telefone || null,
      documento: data.documento || null,
      email: data.email || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/profissionais");
  redirect("/cadastros/profissionais");
}

export async function toggleProfessionalActive(professionalId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  await prisma.professional.update({ where: { id: professionalId }, data: { ativo } });
  revalidatePath("/cadastros/profissionais");
}
