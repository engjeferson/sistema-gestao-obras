"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";

export async function getMyWhatsAppAccount() {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  return prisma.whatsAppAccount.findUnique({ where: { userId: session.user.id } });
}

export async function linkMyWhatsAppAccount(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  const raw = String(formData.get("telefone") ?? "");
  const telefone = normalizeWhatsAppPhone(raw);
  if (telefone.length < 12) {
    return "Informe um número de WhatsApp válido, com DDD.";
  }

  const existing = await prisma.whatsAppAccount.findUnique({ where: { telefone } });
  if (existing && existing.userId !== session.user.id) {
    return "Esse número já está vinculado a outro usuário.";
  }

  await prisma.whatsAppAccount.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, telefone },
    update: { telefone },
  });

  revalidatePath("/agenda");
}

export async function unlinkMyWhatsAppAccount() {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  await prisma.whatsAppAccount.deleteMany({ where: { userId: session.user.id } });
  revalidatePath("/agenda");
}
