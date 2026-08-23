"use client";

import { useState } from "react";
import { AppropriationFilters, type AppropriationViewMode } from "@/components/estoque/appropriation-filters";
import { AppropriationTree } from "@/components/estoque/appropriation-tree";
import type { AppropriationNode } from "@/server/actions/estoque";

export function AppropriationView({
  nodes,
  materials,
  categorias,
}: {
  nodes: AppropriationNode[];
  materials: { id: string; nome: string }[];
  categorias: string[];
}) {
  const [search, setSearch] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [categoria, setCategoria] = useState("");
  const [viewMode, setViewMode] = useState<AppropriationViewMode>("arvore");

  return (
    <div className="flex flex-col gap-4">
      <AppropriationFilters
        materials={materials}
        categorias={categorias}
        search={search}
        onSearchChange={setSearch}
        materialId={materialId}
        onMaterialChange={setMaterialId}
        categoria={categoria}
        onCategoriaChange={setCategoria}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <AppropriationTree nodes={nodes} search={search} materialId={materialId} categoria={categoria} viewMode={viewMode} />
    </div>
  );
}
