"use client";

import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatCurrencyBRL } from "@/lib/status-labels";
import type { StockTransferItemValues } from "@/lib/validations/estoque";

type MaterialOption = { id: string; nome: string };

export function StockTransferItemsEditor({
  items,
  onChange,
  materials,
  saldosOrigem,
}: {
  items: StockTransferItemValues[];
  onChange: (items: StockTransferItemValues[]) => void;
  materials: MaterialOption[];
  saldosOrigem: Record<string, { saldo: number; custoMedio: number }>;
}) {
  function updateItem(index: number, patch: Partial<StockTransferItemValues>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    onChange([...items, { materialId: "", quantidade: 1 }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Material</th>
              <th className="p-2 font-medium">Saldo na origem</th>
              <th className="p-2 font-medium">Custo médio</th>
              <th className="p-2 font-medium">Quantidade</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const info = saldosOrigem[item.materialId] ?? { saldo: 0, custoMedio: 0 };
              const excedeSaldo = item.materialId && item.quantidade > info.saldo;
              return (
                <tr key={index} className="border-t">
                  <td className="p-2">
                    <NativeSelect
                      value={item.materialId}
                      onChange={(e) => updateItem(index, { materialId: e.target.value })}
                      required
                    >
                      <option value="" disabled>
                        Selecione o material
                      </option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.nome}
                        </option>
                      ))}
                    </NativeSelect>
                  </td>
                  <td className={`p-2 whitespace-nowrap ${excedeSaldo ? "text-destructive" : "text-muted-foreground"}`}>
                    {item.materialId ? info.saldo : "—"}
                  </td>
                  <td className="p-2 whitespace-nowrap text-muted-foreground">
                    {item.materialId ? formatCurrencyBRL(info.custoMedio) : "—"}
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantidade}
                      onChange={(e) => updateItem(index, { quantidade: Number(e.target.value) })}
                      className="w-28"
                      required
                    />
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
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="self-start">
        <Plus /> Adicionar item
      </Button>
    </div>
  );
}
