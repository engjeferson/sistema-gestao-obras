import type { Role } from "@/generated/prisma/enums";

/**
 * `null` = enxerga todas as obras (comportamento padrão, igual antes desta feature existir).
 * `string[]` = só pode ver/atuar nas obras com esses IDs (pode ser um array vazio).
 */
export type WorkAccess = string[] | null;

export function resolveWorkAccess(role: Role, restringirObras: boolean, assignedWorkIds: string[]): WorkAccess {
  if (role === "ADMINISTRADOR") return null;
  if (!restringirObras) return null;
  return assignedWorkIds;
}

export function canAccessWork(access: WorkAccess, workId: string): boolean {
  return access === null || access.includes(workId);
}

/** Fragmento de `where` do Prisma pra restringir uma consulta por `workId` — `{}` quando irrestrito. */
export function workIdWhere(access: WorkAccess): { workId: { in: string[] } } | Record<string, never> {
  return access === null ? {} : { workId: { in: access } };
}
