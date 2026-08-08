"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RdoWorkerValues } from "@/lib/validations/rdo";

export function RdoWorkersEditor({
  workers,
  onChange,
}: {
  workers: RdoWorkerValues[];
  onChange: (workers: RdoWorkerValues[]) => void;
}) {
  function update(index: number, patch: Partial<RdoWorkerValues>) {
    onChange(workers.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  return (
    <div className="flex flex-col gap-2">
      {workers.map((worker, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="Função (ex: Pedreiro)"
            value={worker.funcao}
            onChange={(e) => update(index, { funcao: e.target.value })}
            className="flex-1"
          />
          <Input
            type="number"
            min="1"
            placeholder="Qtd."
            value={worker.quantidade}
            onChange={(e) => update(index, { quantidade: Number(e.target.value) })}
            className="w-20"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(workers.filter((_, i) => i !== index))}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...workers, { funcao: "", quantidade: 1 }])}
      >
        <Plus /> Adicionar função
      </Button>
    </div>
  );
}
