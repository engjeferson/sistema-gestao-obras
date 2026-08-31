"use client";

import type { ModulePermissions } from "@/lib/module-permissions";

const MODULE_FIELDS: { name: keyof ModulePermissions; label: string }[] = [
  { name: "planejamentoSomenteLeitura", label: "Planejamento" },
  { name: "rdoSomenteLeitura", label: "RDO" },
  { name: "contratosSomenteLeitura", label: "Contratos" },
  { name: "notasFiscaisSomenteLeitura", label: "Notas Fiscais" },
  { name: "cadastrosSomenteLeitura", label: "Cadastros (clientes, fornecedores, profissionais)" },
];

export function ModulePermissionsFields({ defaultValues }: { defaultValues?: ModulePermissions }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Edição por módulo</p>
        <p className="text-xs text-muted-foreground">
          Administradores sempre podem editar tudo — estas opções são ignoradas para esse perfil. Marcado = só
          visualiza, não pode criar, editar ou excluir nesse módulo.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {MODULE_FIELDS.map((field) => (
          <label key={field.name} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={field.name} defaultChecked={defaultValues ? defaultValues[field.name] : false} />
            Só visualizar {field.label}
          </label>
        ))}
      </div>
    </div>
  );
}
