"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveFinancePermissions, DEFAULT_FINANCE_PERMISSIONS } from "@/lib/finance-permissions";

export async function getCurrentFinancePermissions() {
  const session = await auth();
  if (!session?.user) return DEFAULT_FINANCE_PERMISSIONS;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, financePermissions: true },
  });
  if (!user) return DEFAULT_FINANCE_PERMISSIONS;

  return resolveFinancePermissions(user.role, user.financePermissions);
}
