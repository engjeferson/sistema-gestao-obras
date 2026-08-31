import type { Role } from "@/generated/prisma/enums";

export type ModulePermissions = {
  planejamentoSomenteLeitura: boolean;
  rdoSomenteLeitura: boolean;
  contratosSomenteLeitura: boolean;
  notasFiscaisSomenteLeitura: boolean;
  cadastrosSomenteLeitura: boolean;
};

export const DEFAULT_MODULE_PERMISSIONS: ModulePermissions = {
  planejamentoSomenteLeitura: false,
  rdoSomenteLeitura: false,
  contratosSomenteLeitura: false,
  notasFiscaisSomenteLeitura: false,
  cadastrosSomenteLeitura: false,
};

export function resolveModulePermissions(role: Role, raw: unknown): ModulePermissions {
  if (role === "ADMINISTRADOR") return DEFAULT_MODULE_PERMISSIONS;
  if (!raw || typeof raw !== "object") return DEFAULT_MODULE_PERMISSIONS;

  const perms = raw as Record<string, unknown>;
  return {
    planejamentoSomenteLeitura: perms.planejamentoSomenteLeitura === true,
    rdoSomenteLeitura: perms.rdoSomenteLeitura === true,
    contratosSomenteLeitura: perms.contratosSomenteLeitura === true,
    notasFiscaisSomenteLeitura: perms.notasFiscaisSomenteLeitura === true,
    cadastrosSomenteLeitura: perms.cadastrosSomenteLeitura === true,
  };
}
