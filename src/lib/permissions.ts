import type { Session } from "next-auth";
import type { Role } from "@/generated/prisma/enums";
import type { WorkAccess } from "@/lib/work-access";
import { canAccessWork } from "@/lib/work-access";

export class ForbiddenError extends Error {
  constructor(message = "Acesso não autorizado.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertRole(session: Session | null, allowedRoles: Role[]): asserts session is Session {
  if (!session?.user) {
    throw new ForbiddenError("Sessão não encontrada.");
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new ForbiddenError("Você não tem permissão para executar esta ação.");
  }
}

export function assertWorkAccess(access: WorkAccess, workId: string): void {
  if (!canAccessWork(access, workId)) {
    throw new ForbiddenError("Você não tem acesso a esta obra.");
  }
}
