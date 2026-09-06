"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { assertModuleWrite } from "@/server/actions/permissions";
import { clientFormSchema } from "@/lib/validations/clientes";
import { joinPeopleNames } from "@/lib/text";

export async function listClients() {
  return prisma.client.findMany({ orderBy: { nome: "asc" } });
}

export async function getClient(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    include: { people: { orderBy: { createdAt: "asc" } } },
  });
}

function parseJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

function parseClientForm(formData: FormData) {
  return clientFormSchema.safeParse({
    people: parseJsonField(formData, "peopleJson", []),
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
  const nome = joinPeopleNames(data.people.map((p) => p.nome));

  await prisma.client.create({
    data: {
      nome,
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
      people: {
        create: data.people.map((p) => ({
          nome: p.nome,
          dataAniversario: p.dataAniversario ? new Date(p.dataAniversario) : null,
        })),
      },
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
  const nome = joinPeopleNames(data.people.map((p) => p.nome));

  await prisma.client.update({
    where: { id: clientId },
    data: {
      nome,
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
      people: {
        deleteMany: {},
        create: data.people.map((p) => ({
          nome: p.nome,
          dataAniversario: p.dataAniversario ? new Date(p.dataAniversario) : null,
        })),
      },
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
