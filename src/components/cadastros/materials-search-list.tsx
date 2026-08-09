"use client";

import { useMemo, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";
import { MaterialsTable } from "@/components/cadastros/materials-table";
import { normalizeSearch } from "@/lib/text";

type MaterialRow = {
  id: string;
  nome: string;
  unidadePadrao: string | null;
  categoria: string | null;
  ativo: boolean;
};

export function MaterialsSearchList({ materials }: { materials: MaterialRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return materials;
    return materials.filter((m) =>
      [m.nome, m.categoria].some((field) => field && normalizeSearch(field).includes(q)),
    );
  }, [materials, query]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Buscar material por nome ou categoria... ex: tinta, lixa, revestimento"
        resultCount={filtered.length}
        totalCount={materials.length}
      />
      <MaterialsTable materials={filtered} />
    </div>
  );
}
