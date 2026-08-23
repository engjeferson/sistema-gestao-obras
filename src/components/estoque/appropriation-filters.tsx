"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export type AppropriationViewMode = "arvore" | "atividades" | "recursos";

const VIEW_MODE_OPTIONS: { value: AppropriationViewMode; label: string }[] = [
  { value: "arvore", label: "Etapas" },
  { value: "atividades", label: "Atividades" },
  { value: "recursos", label: "Recursos" },
];

export function AppropriationFilters({
  materials,
  categorias,
  search,
  onSearchChange,
  materialId,
  onMaterialChange,
  categoria,
  onCategoriaChange,
  viewMode,
  onViewModeChange,
}: {
  materials: { id: string; nome: string }[];
  categorias: string[];
  search: string;
  onSearchChange: (value: string) => void;
  materialId: string;
  onMaterialChange: (value: string) => void;
  categoria: string;
  onCategoriaChange: (value: string) => void;
  viewMode: AppropriationViewMode;
  onViewModeChange: (mode: AppropriationViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Buscar etapa, atividade ou recurso</label>
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Digite para buscar"
          className="w-64"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Filtrar por recurso</label>
        <Combobox
          value={materialId}
          onChange={onMaterialChange}
          options={materials.map((m) => ({ value: m.id, label: m.nome }))}
          placeholder="Selecione um recurso"
          className="w-56"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Filtrar por grupo</label>
        <NativeSelect className="w-auto" value={categoria} onChange={(e) => onCategoriaChange(e.target.value)}>
          <option value="">Todos os grupos</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-muted p-1">
        {VIEW_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onViewModeChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              viewMode === option.value
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
