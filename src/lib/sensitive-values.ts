import type { Role } from "@/generated/prisma/enums";

/** Esconde valor de contrato, custo de material e valor de nota fiscal de quem não pode ver. */
export function canSeeSensitiveValues(role: Role, verValoresSensiveis: boolean): boolean {
  if (role === "ADMINISTRADOR") return true;
  return verValoresSensiveis;
}

/** Mostrar ou não a aba/seção de Contratos da obra pra esse usuário. */
export function canViewContratos(role: Role, verContratos: boolean): boolean {
  if (role === "ADMINISTRADOR") return true;
  return verContratos;
}
