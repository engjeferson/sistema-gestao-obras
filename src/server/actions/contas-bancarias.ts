"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { bankAccountFormSchema } from "@/lib/validations/contas-bancarias";

export async function listBankAccounts() {
  return prisma.bankAccount.findMany({ orderBy: { nome: "asc" } });
}

export async function listActiveBankAccounts() {
  return prisma.bankAccount.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}

export async function getBankAccount(bankAccountId: string) {
  return prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
}

function parseBankAccountForm(formData: FormData) {
  return bankAccountFormSchema.safeParse({
    nome: formData.get("nome"),
    banco: formData.get("banco") ?? undefined,
    agencia: formData.get("agencia") ?? undefined,
    conta: formData.get("conta") ?? undefined,
    tipo: formData.get("tipo"),
    saldoInicial: formData.get("saldoInicial") ?? "",
    diaFechamento: formData.get("diaFechamento") ?? "",
    diaVencimento: formData.get("diaVencimento") ?? "",
    observacoes: formData.get("observacoes") ?? undefined,
  });
}

export async function createBankAccount(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  const parsed = parseBankAccountForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.bankAccount.create({
    data: {
      nome: data.nome,
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      tipo: data.tipo,
      saldoInicial: data.saldoInicial ?? null,
      diaFechamento: data.tipo === "CARTAO_CREDITO" ? (data.diaFechamento ?? null) : null,
      diaVencimento: data.tipo === "CARTAO_CREDITO" ? (data.diaVencimento ?? null) : null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/contas-bancarias");
  redirect("/cadastros/contas-bancarias");
}

export async function updateBankAccount(
  bankAccountId: string,
  _prevState: string | undefined,
  formData: FormData,
) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  const parsed = parseBankAccountForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      nome: data.nome,
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      tipo: data.tipo,
      saldoInicial: data.saldoInicial ?? null,
      diaFechamento: data.tipo === "CARTAO_CREDITO" ? (data.diaFechamento ?? null) : null,
      diaVencimento: data.tipo === "CARTAO_CREDITO" ? (data.diaVencimento ?? null) : null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/contas-bancarias");
  redirect("/cadastros/contas-bancarias");
}

export async function toggleBankAccountActive(bankAccountId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"]);

  await prisma.bankAccount.update({ where: { id: bankAccountId }, data: { ativo } });
  revalidatePath("/cadastros/contas-bancarias");
}
