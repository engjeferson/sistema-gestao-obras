"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { userFormSchema, userEditFormSchema } from "@/lib/validations/usuarios";

function parseFinancePermissionFields(formData: FormData) {
  return {
    verEntradas: formData.get("verEntradas") === "on",
    verSaidas: formData.get("verSaidas") === "on",
    verSaldo: formData.get("verSaldo") === "on",
    verSaudeFinanceira: formData.get("verSaudeFinanceira") === "on",
    todasCategorias: formData.get("todasCategorias") === "on",
    categoriasPermitidasIds: formData.getAll("categoriasPermitidasIds").map(String),
  };
}

function buildFinancePermissions(data: ReturnType<typeof parseFinancePermissionFields>) {
  return {
    verEntradas: data.verEntradas,
    verSaidas: data.verSaidas,
    verSaldo: data.verSaldo,
    verSaudeFinanceira: data.verSaudeFinanceira,
    categoriasPermitidasIds: data.todasCategorias ? null : data.categoriasPermitidasIds,
  };
}

function parseWorkAccessFields(formData: FormData) {
  return {
    restringirObras: formData.get("restringirObras") === "on",
    assignedWorkIds: formData.getAll("assignedWorkIds").map(String),
  };
}

export async function listUsers() {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getUser(userId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);
  return prisma.user.findUnique({
    where: { id: userId },
    include: { assignedWorks: { select: { workId: true } } },
  });
}

export async function createUser(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const permissionFields = parseFinancePermissionFields(formData);
  const workAccessFields = parseWorkAccessFields(formData);
  const parsed = userFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    ...permissionFields,
    ...workAccessFields,
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
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      financePermissions: buildFinancePermissions(permissionFields),
      restringirObras: workAccessFields.restringirObras,
      assignedWorks: {
        create: workAccessFields.assignedWorkIds.map((workId) => ({ workId })),
      },
    },
  });

  revalidatePath("/configuracoes/usuarios");
  return undefined;
}

export async function updateUser(userId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR"]);

  const permissionFields = parseFinancePermissionFields(formData);
  const workAccessFields = parseWorkAccessFields(formData);
  const parsed = userEditFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    role: formData.get("role"),
    ...permissionFields,
    ...workAccessFields,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing && existing.id !== userId) {
    return "Já existe um usuário com esse e-mail.";
  }

  await prisma.$transaction([
    prisma.userWork.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        financePermissions: buildFinancePermissions(permissionFields),
        restringirObras: workAccessFields.restringirObras,
        assignedWorks: {
          create: workAccessFields.assignedWorkIds.map((workId) => ({ workId })),
        },
        ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
      },
    }),
  ]);

  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
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
