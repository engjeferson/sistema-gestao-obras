"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { resolveFinancePermissions, DEFAULT_FINANCE_PERMISSIONS } from "@/lib/finance-permissions";
import { resolveWorkAccess, type WorkAccess } from "@/lib/work-access";
import {
  resolveModulePermissions,
  DEFAULT_MODULE_PERMISSIONS,
  type ModulePermissions,
} from "@/lib/module-permissions";
import { canSeeSensitiveValues, canViewContratos } from "@/lib/sensitive-values";
import { resolveReportPermissions, DEFAULT_REPORT_PERMISSIONS, type ReportPermissions } from "@/lib/report-permissions";

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

export async function getCurrentModulePermissions(): Promise<ModulePermissions> {
  const session = await auth();
  if (!session?.user) return DEFAULT_MODULE_PERMISSIONS;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modulePermissions: true },
  });
  if (!user) return DEFAULT_MODULE_PERMISSIONS;

  return resolveModulePermissions(user.role, user.modulePermissions);
}

/** Lança `ForbiddenError` se o usuário logado só tem acesso de visualização a esse módulo. */
export async function assertModuleWrite(module: keyof ModulePermissions): Promise<void> {
  const permissions = await getCurrentModulePermissions();
  if (permissions[module]) {
    throw new ForbiddenError("Você só tem acesso de visualização a este módulo.");
  }
}

export async function getCurrentSensitiveValuesAccess(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, verValoresSensiveis: true },
  });
  if (!user) return false;

  return canSeeSensitiveValues(user.role, user.verValoresSensiveis);
}

export async function getCurrentContratosVisibility(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, verContratos: true },
  });
  if (!user) return false;

  return canViewContratos(user.role, user.verContratos);
}

export async function getCurrentReportPermissions(): Promise<ReportPermissions> {
  const session = await auth();
  if (!session?.user) return DEFAULT_REPORT_PERMISSIONS;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, reportPermissions: true },
  });
  if (!user) return DEFAULT_REPORT_PERMISSIONS;

  return resolveReportPermissions(user.role, user.reportPermissions);
}
