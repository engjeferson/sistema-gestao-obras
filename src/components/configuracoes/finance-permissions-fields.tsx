"use client";

import { useState } from "react";
import type { FinancePermissions } from "@/lib/finance-permissions";

const TOGGLE_FIELDS: {
  name: keyof Pick<
    FinancePermissions,
    "verEntradas" | "verSaidas" | "verSaldo" | "verSaudeFinanceira" | "verSaudeFinanceiraObra"
  >;
  label: string;
}[] = [
  { name: "verEntradas", label: "Ver entradas (contas a receber)" },
  { name: "verSaidas", label: "Ver saídas (contas a pagar)" },
  { name: "verSaldo", label: "Ver saldo" },
  { name: "verSaudeFinanceira", label: "Ver saúde financeira da empresa (total)" },
  { name: "verSaudeFinanceiraObra", label: "Ver saúde financeira de cada obra" },
];

export function FinancePermissionsFields({
  categorias,
  defaultValues,
}: {
  categorias: { id: string; nome: string }[];
  defaultValues?: FinancePermissions;
}) {
  const [todasCategorias, setTodasCategorias] = useState(
    !defaultValues || defaultValues.categoriasPermitidasIds === null,
  );
  const selecionadas = new Set(defaultValues?.categoriasPermitidasIds ?? []);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Permissões financeiras</p>
        <p className="text-xs text-muted-foreground">
          Administradores sempre têm acesso total — estas opções são ignoradas para esse perfil.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {TOGGLE_FIELDS.map((field) => (
          <label key={field.name} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={field.name}
              defaultChecked={defaultValues ? defaultValues[field.name] : true}
            />
            {field.label}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="todasCategorias"
            checked={todasCategorias}
            onChange={(e) => setTodasCategorias(e.target.checked)}
          />
          Todas as categorias financeiras
        </label>
        {!todasCategorias ? (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {categorias.map((categoria) => (
              <label key={categoria.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="categoriasPermitidasIds"
                  value={categoria.id}
                  defaultChecked={selecionadas.has(categoria.id)}
                />
                {categoria.nome}
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
