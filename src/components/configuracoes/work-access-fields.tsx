"use client";

import { useState } from "react";

export function WorkAccessFields({
  works,
  defaultValues,
}: {
  works: { id: string; nome: string; codigo: string }[];
  defaultValues?: { restringirObras: boolean; assignedWorkIds: string[] };
}) {
  const [restringir, setRestringir] = useState(defaultValues?.restringirObras ?? false);
  const selecionadas = new Set(defaultValues?.assignedWorkIds ?? []);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Acesso a obras</p>
        <p className="text-xs text-muted-foreground">
          Administradores sempre têm acesso a todas as obras — esta opção é ignorada para esse perfil.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="restringirObras"
          checked={restringir}
          onChange={(e) => setRestringir(e.target.checked)}
        />
        Restringir a obras específicas
      </label>

      {restringir ? (
        <div className="grid gap-1.5 border-t pt-3 sm:grid-cols-2">
          {works.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada ainda.</p>
          ) : (
            works.map((work) => (
              <label key={work.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="assignedWorkIds"
                  value={work.id}
                  defaultChecked={selecionadas.has(work.id)}
                />
                {work.codigo} — {work.nome}
              </label>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
