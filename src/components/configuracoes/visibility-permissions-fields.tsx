"use client";

import type { ReportPermissions } from "@/lib/report-permissions";

export function VisibilityPermissionsFields({
  verValoresSensiveis,
  verContratos,
  reportPermissions,
}: {
  verValoresSensiveis?: boolean;
  verContratos?: boolean;
  reportPermissions?: ReportPermissions;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Visibilidade</p>
        <p className="text-xs text-muted-foreground">
          Administradores sempre têm visibilidade total — estas opções são ignoradas para esse perfil.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="verValoresSensiveis"
          defaultChecked={verValoresSensiveis ?? true}
        />
        Ver valores e custos sensíveis (valor de contrato, custo de material, valor de nota fiscal)
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verContratos" defaultChecked={verContratos ?? true} />
        Ver a aba Contratos da obra
      </label>

      <div className="flex flex-col gap-2 border-t pt-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="verRelatoriosFinanceiros"
            defaultChecked={reportPermissions ? reportPermissions.verRelatoriosFinanceiros : true}
          />
          Relatórios financeiros (despesas, contas a pagar, notas fiscais)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="verRelatoriosOperacionais"
            defaultChecked={reportPermissions ? reportPermissions.verRelatoriosOperacionais : true}
          />
          Relatórios operacionais (orçamento, previsto x realizado, custos por etapa)
        </label>
      </div>
    </div>
  );
}
