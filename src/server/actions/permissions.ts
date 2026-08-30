"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveFinancePermissions, DEFAULT_FINANCE_PERMISSIONS } from "@/lib/finance-permissions";
import { resolveWorkAccess, type WorkAccess } from "@/lib/work-access";

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

/** `null` = enxerga todas as obras; `[]`/array = restrito às obras atribuídas a ele. */
export async function getCurrentWorkAccess(): Promise<WorkAccess> {
  const session = await auth();
  if (!session?.user) return [];

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, restringirObras: true, assignedWorks: { select: { workId: true } } },
  });
  if (!user) return [];

  return resolveWorkAccess(
    user.role,
    user.restringirObras,
    user.assignedWorks.map((a) => a.workId),
  );
}
