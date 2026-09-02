"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatCurrencyBRL } from "@/lib/status-labels";
import { findSimilarMaterial, normalizeSearch } from "@/lib/text";
import type { InvoiceItemValues } from "@/lib/validations/notas-fiscais";

const UNIT_LABELS: Record<string, string> = {
  UN: "un",
  KG: "kg",
  M: "m",
  M2: "m²",
  M3: "m³",
  SACO: "saco",
  CAIXA: "caixa",
  LITRO: "litro",
};

const EMPTY_ITEM: InvoiceItemValues = { material: "", quantidade: 0, unidade: "UN", valorUnitario: 0 };

export function InvoiceItemsEditor({
  items,
  onChange,
  materials = [],
}: {
  items: InvoiceItemValues[];
  onChange: (items: InvoiceItemValues[]) => void;
  materials?: { nome: string; unidadePadrao: string | null; precoUnitario: number | null }[];
}) {
  const materialByName = new Map(materials.map((m) => [m.nome, m]));
  const materialByNormalized = new Map(materials.map((m) => [normalizeSearch(m.nome), m]));
  // Guarda, por linha, o texto pro qual o usuário já disse "não, é um material diferente" —
  // evita ficar reexibindo a mesma sugestão de material parecido depois que ele já recusou.
  const [dismissed, setDismissed] = useState<Record<number, string>>({});

  function updateItem(index: number, patch: Partial<InvoiceItemValues>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleMaterialChange(index: number, nome: string) {
    const known = materialByName.get(nome);
    const current = items[index];
    updateItem(index, {
      material: nome,
      ...(known?.unidadePadrao ? { unidade: known.unidadePadrao as InvoiceItemValues["unidade"] } : {}),
      ...(known?.precoUnitario && !current.valorUnitario ? { valorUnitario: known.precoUnitario } : {}),
    });
  }

  function acceptSuggestion(index: number, material: { nome: string; unidadePadrao: string | null; precoUnitario: number | null }) {
    const current = items[index];
    updateItem(index, {
      material: material.nome,
      ...(material.unidadePadrao ? { unidade: material.unidadePadrao as InvoiceItemValues["unidade"] } : {}),
      ...(material.precoUnitario && !current.valorUnitario ? { valorUnitario: material.precoUnitario } : {}),
    });
  }

  function dismissSuggestion(index: number, nome: string) {
    setDismissed((prev) => ({ ...prev, [index]: nome }));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  const total = items.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0);

  return (
    <div className="flex flex-col gap-3">
      <datalist id="materiais-cadastrados">
        {materials.map((material) => (
          <option key={material.nome} value={material.nome} />
        ))}
      </datalist>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Material</th>
              <th className="w-24 p-2">Qtd.</th>
              <th className="w-24 p-2">Un.</th>
              <th className="w-32 p-2">Valor unit. (R$)</th>
              <th className="w-32 p-2">Total</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const isExact = materialByNormalized.has(normalizeSearch(item.material));
              const isDismissed = dismissed[index] === item.material;
              const similar = item.material.trim() && !isExact && !isDismissed ? findSimilarMaterial(item.material, materials) : null;

              return (
              <tr key={index} className="border-b last:border-0">
                <td className="p-2">
                  <Input
                    value={item.material}
                    onChange={(e) => handleMaterialChange(index, e.target.value)}
                    placeholder="Ex: Cimento CP-II"
                    list="materiais-cadastrados"
                  />
                  {item.material.trim() ? (
                    isExact ? (
                      <p className="mt-1 text-xs text-success">Cadastrado</p>
                    ) : similar ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                        <span>
                          Parece com <strong>{similar.nome}</strong>, já cadastrado. É o mesmo material?
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => acceptSuggestion(index, similar)}
                          >
                            Sim, usar este
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => dismissSuggestion(index, item.material)}
                          >
                            Não, são diferentes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-warning">
                        Novo material — será cadastrado com este nome
                      </p>
                    )
                  ) : null}
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={item.quantidade || ""}
                    onChange={(e) => updateItem(index, { quantidade: Number(e.target.value) })}
                  />
                </td>
                <td className="p-2">
                  <NativeSelect
                    value={item.unidade}
                    onChange={(e) => updateItem(index, { unidade: e.target.value as InvoiceItemValues["unidade"] })}
                  >
                    {Object.entries(UNIT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td className="p-2">
                  <CurrencyInput
                    value={item.valorUnitario}
                    onValueChange={(valorUnitario) => updateItem(index, { valorUnitario })}
                  />
                </td>
                <td className="p-2 whitespace-nowrap">
                  {formatCurrencyBRL(item.quantidade * item.valorUnitario)}
                </td>
                <td className="p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus /> Adicionar item
        </Button>
        <p className="text-sm font-medium">Total: {formatCurrencyBRL(total)}</p>
      </div>
    </div>
  );
}
