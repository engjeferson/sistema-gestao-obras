"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { userFormSchema } from "@/lib/validations/usuarios";

export async function listUsers() {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createUser(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const parsed = userFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return "Já existe um usuário com esse e-mail.";
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
  });

  revalidatePath("/configuracoes/usuarios");
  return undefined;
}

export async function toggleUserActive(userId: string, active: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  if (userId === session.user.id) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/configuracoes/usuarios");
}
