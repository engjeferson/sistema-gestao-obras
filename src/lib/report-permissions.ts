import type { Role } from "@/generated/prisma/enums";

export type ReportPermissions = {
  verRelatoriosFinanceiros: boolean;
  verRelatoriosOperacionais: boolean;
};

export const DEFAULT_REPORT_PERMISSIONS: ReportPermissions = {
  verRelatoriosFinanceiros: true,
  verRelatoriosOperacionais: true,
};

export function resolveReportPermissions(role: Role, raw: unknown): ReportPermissions {
  if (role === "ADMINISTRADOR") return DEFAULT_REPORT_PERMISSIONS;
  if (!raw || typeof raw !== "object") return DEFAULT_REPORT_PERMISSIONS;

  const perms = raw as Record<string, unknown>;
  return {
    verRelatoriosFinanceiros: typeof perms.verRelatoriosFinanceiros === "boolean" ? perms.verRelatoriosFinanceiros : true,
    verRelatoriosOperacionais:
      typeof perms.verRelatoriosOperacionais === "boolean" ? perms.verRelatoriosOperacionais : true,
  };
}
