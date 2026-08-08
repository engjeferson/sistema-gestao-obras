"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import type { RdoOccurrenceValues } from "@/lib/validations/rdo";

const OCCURRENCE_LABELS: Record<string, string> = {
  PROBLEMA: "Problema",
  ATRASO: "Atraso",
  FALTA_MATERIAL: "Falta de material",
  ALTERACAO: "Alteração",
  VISITA: "Visita",
  OBSERVACAO: "Observação",
};

export function RdoOccurrencesEditor({
  occurrences,
  onChange,
}: {
  occurrences: RdoOccurrenceValues[];
  onChange: (occurrences: RdoOccurrenceValues[]) => void;
}) {
  function update(index: number, patch: Partial<RdoOccurrenceValues>) {
    onChange(occurrences.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  return (
    <div className="flex flex-col gap-2">
      {occurrences.map((occurrence, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start">
          <NativeSelect
            value={occurrence.tipo}
            onChange={(e) => update(index, { tipo: e.target.value as RdoOccurrenceValues["tipo"] })}
            className="sm:w-48"
          >
            {Object.entries(OCCURRENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <Textarea
            placeholder="Descrição"
            value={occurrence.descricao}
            onChange={(e) => update(index, { descricao: e.target.value })}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(occurrences.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...occurrences, { tipo: "OBSERVACAO", descricao: "" }])}
      >
        <Plus /> Adicionar ocorrência
      </Button>
    </div>
  );
}
