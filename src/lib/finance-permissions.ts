import type { Role, TransactionType } from "@/generated/prisma/enums";

export type FinancePermissions = {
  verEntradas: boolean;
  verSaidas: boolean;
  verSaldo: boolean;
  verSaudeFinanceira: boolean;
  categoriasPermitidasIds: string[] | null;
};

export const DEFAULT_FINANCE_PERMISSIONS: FinancePermissions = {
  verEntradas: true,
  verSaidas: true,
  verSaldo: true,
  verSaudeFinanceira: true,
  categoriasPermitidasIds: null,
};

export function resolveFinancePermissions(role: Role, raw: unknown): FinancePermissions {
  if (role === "ADMINISTRADOR") return DEFAULT_FINANCE_PERMISSIONS;
  if (!raw || typeof raw !== "object") return DEFAULT_FINANCE_PERMISSIONS;

  const fin = raw as Record<string, unknown>;
  return {
    verEntradas: typeof fin.verEntradas === "boolean" ? fin.verEntradas : true,
    verSaidas: typeof fin.verSaidas === "boolean" ? fin.verSaidas : true,
    verSaldo: typeof fin.verSaldo === "boolean" ? fin.verSaldo : true,
    verSaudeFinanceira: typeof fin.verSaudeFinanceira === "boolean" ? fin.verSaudeFinanceira : true,
    categoriasPermitidasIds: Array.isArray(fin.categoriasPermitidasIds)
      ? (fin.categoriasPermitidasIds as string[])
      : null,
  };
}

/**
 * Aplica as permissões financeiras de um usuário sobre um filtro de transações
 * já montado pela página (a partir dos searchParams). Se só um lado (entradas/saídas)
 * for permitido, força o `tipo`; se houver restrição de categorias, troca `categoriaId`
 * por `categoriaIdIn` (a menos que a categoria já escolhida esteja fora do permitido).
 */
export function restrictTransactionFilters<T extends { tipo?: TransactionType; categoriaId?: string }>(
  filters: T,
  perms: FinancePermissions,
): T & { categoriaIdIn?: string[] } {
  let tipo = filters.tipo;
  if (!perms.verEntradas && perms.verSaidas) tipo = "PAGAR";
  if (!perms.verSaidas && perms.verEntradas) tipo = "RECEBER";

  let categoriaId = filters.categoriaId;
  let categoriaIdIn: string[] | undefined;
  if (perms.categoriasPermitidasIds) {
    if (categoriaId && !perms.categoriasPermitidasIds.includes(categoriaId)) {
      categoriaId = undefined;
    }
    if (!categoriaId) {
      categoriaIdIn = perms.categoriasPermitidasIds;
    }
  }

  return { ...filters, tipo, categoriaId, categoriaIdIn };
}
