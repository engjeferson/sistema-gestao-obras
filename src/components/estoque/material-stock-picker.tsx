"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MaterialStockOption = { id: string; nome: string; unidadePadrao: string | null };

/**
 * Lista sempre visível (não escondida num dropdown) dos materiais com saldo na origem
 * selecionada, com busca por nome e saldo numa coluna ao lado — clicar na linha seleciona.
 */
export function MaterialStockPicker({
  materials,
  saldosLocal,
  materialId,
  onSelect,
}: {
  // Já filtrado por quem tem estoque na origem (+ o selecionado, mesmo que tenha zerado) —
  // este componente só exibe e busca por nome, não decide elegibilidade.
  materials: MaterialStockOption[];
  saldosLocal: Record<string, { saldo: number; custoMedio: number }>;
  materialId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q ? materials.filter((m) => m.nome.toLowerCase().includes(q)) : materials;

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Buscar material..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-64 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {materials.length === 0 ? "Nenhum material com saldo nesta origem." : "Nenhum resultado."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Material</th>
                <th className="p-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const saldo = saldosLocal[m.id]?.saldo ?? 0;
                const selected = m.id === materialId;
                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelect(m.id)}
                    className={cn(
                      "cursor-pointer border-t transition-colors hover:bg-muted/50",
                      selected && "bg-primary/10 font-medium",
                    )}
                  >
                    <td className="p-2">{m.nome}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      {saldo}
                      {m.unidadePadrao ? ` ${m.unidadePadrao}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
