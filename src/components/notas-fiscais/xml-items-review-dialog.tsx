"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { InvoiceItemValues } from "@/lib/validations/notas-fiscais";

export function XmlItemsReviewDialog({
  open,
  items,
  materials,
  units,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  items: InvoiceItemValues[];
  materials: { nome: string; unidadePadrao: string | null }[];
  units: { sigla: string; nome: string | null }[];
  onCancel: () => void;
  onConfirm: (items: InvoiceItemValues[]) => void;
}) {
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [unidades, setUnidades] = useState<Record<number, string>>({});
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    if (!open) return;
    setOverrides(
      Object.fromEntries(
        items.map((item, index) => {
          const exact = materials.find(
            (material) => material.nome.trim().toLowerCase() === item.material.trim().toLowerCase(),
          );
          return [index, exact?.nome ?? ""];
        }),
      ),
    );
    setUnidades(Object.fromEntries(items.map((item, index) => [index, item.unidade])));
    setFiltro("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleConfirm() {
    const resolved = items.map((item, index) => ({
      ...item,
      material: overrides[index]?.trim() || item.material,
      unidade: unidades[index] ?? item.unidade,
    }));
    onConfirm(resolved);
  }

  const filtroNormalizado = filtro.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Itens do XML</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <datalist id="materiais-cadastrados-xml">
            {materials.map((material) => (
              <option key={material.nome} value={material.nome} />
            ))}
          </datalist>

          <div className="relative sm:w-64 sm:self-end">
            <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar por nome"
              className="pl-8"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Nome no XML</th>
                  <th className="p-2">Nome cadastrado na base</th>
                  <th className="w-24 p-2">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  if (filtroNormalizado && !item.material.toLowerCase().includes(filtroNormalizado)) return null;
                  return (
                    <tr key={index} className="border-b last:border-0">
                      <td className="p-2">{item.material}</td>
                      <td className="p-2">
                        <Input
                          value={overrides[index] ?? ""}
                          onChange={(e) => setOverrides((prev) => ({ ...prev, [index]: e.target.value }))}
                          list="materiais-cadastrados-xml"
                          placeholder="Deixe em branco pra cadastrar como novo"
                        />
                      </td>
                      <td className="p-2">
                        <NativeSelect
                          value={unidades[index] ?? item.unidade}
                          onChange={(e) =>
                            setUnidades((prev) => ({
                              ...prev,
                              [index]: e.target.value,
                            }))
                          }
                        >
                          {units.map((unit) => (
                            <option key={unit.sigla} value={unit.sigla}>
                              {unit.sigla}
                            </option>
                          ))}
                        </NativeSelect>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Usar estes itens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
