"use client";

import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
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
    onChange([...items, { materialId: "", quantidade: 0 }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  const materiaisComSaldo = materials.filter((m) => (saldosOrigem[m.id]?.saldo ?? 0) > 0);

  function optionsFor(currentMaterialId: string) {
    if (currentMaterialId && !materiaisComSaldo.some((m) => m.id === currentMaterialId)) {
      const atual = materials.find((m) => m.id === currentMaterialId);
      if (atual) return [atual, ...materiaisComSaldo];
    }
    return materiaisComSaldo;
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
                    <Combobox
                      value={item.materialId}
                      onChange={(materialId) => updateItem(index, { materialId })}
                      options={optionsFor(item.materialId).map((m) => ({ value: m.id, label: m.nome }))}
                      placeholder="Buscar material..."
                      emptyMessage="Nenhum material com saldo nesta origem."
                      className="min-w-[16rem]"
                    />
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
                      value={item.quantidade || ""}
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
