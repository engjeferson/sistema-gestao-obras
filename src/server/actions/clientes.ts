"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { assertModuleWrite } from "@/server/actions/permissions";
import { clientFormSchema } from "@/lib/validations/clientes";

export async function listClients() {
  return prisma.client.findMany({ orderBy: { nome: "asc" } });
}

export async function getClient(clientId: string) {
  return prisma.client.findUnique({ where: { id: clientId } });
}

function parseClientForm(formData: FormData) {
  return clientFormSchema.safeParse({
    nome: formData.get("nome"),
    documento: formData.get("documento") ?? undefined,
    telefone: formData.get("telefone") ?? undefined,
    email: formData.get("email") ?? undefined,
    endereco: formData.get("endereco") ?? undefined,
    cep: formData.get("cep") ?? undefined,
    numero: formData.get("numero") ?? undefined,
    complemento: formData.get("complemento") ?? undefined,
    bairro: formData.get("bairro") ?? undefined,
    cidade: formData.get("cidade") ?? undefined,
    uf: formData.get("uf") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
  });
}

export async function createClient(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.client.create({
    data: {
      nome: data.nome,
      documento: data.documento || null,
      telefone: data.telefone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      cep: data.cep || null,
      numero: data.numero || null,
      complemento: data.complemento || null,
      bairro: data.bairro || null,
      cidade: data.cidade || null,
      uf: data.uf || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/clientes");
  redirect("/cadastros/clientes");
}

export async function updateClient(clientId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      nome: data.nome,
      documento: data.documento || null,
      telefone: data.telefone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      cep: data.cep || null,
      numero: data.numero || null,
      complemento: data.complemento || null,
      bairro: data.bairro || null,
      cidade: data.cidade || null,
      uf: data.uf || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/clientes");
  redirect("/cadastros/clientes");
}

export async function toggleClientActive(clientId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
  await assertModuleWrite("cadastrosSomenteLeitura");

  await prisma.client.update({ where: { id: clientId }, data: { ativo } });
  revalidatePath("/cadastros/clientes");
}
