"use client";

import { useMemo, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";
import { ProfessionalsTable } from "@/components/cadastros/professionals-table";
import { normalizeSearch } from "@/lib/text";

type ProfessionalRow = {
  id: string;
  nome: string;
  tipo: { nome: string };
  telefone: string | null;
  documento: string | null;
  ativo: boolean;
};

export function ProfessionalsSearchList({ professionals }: { professionals: ProfessionalRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return professionals;
    return professionals.filter((p) =>
      [p.nome, p.tipo.nome, p.documento, p.telefone].some((field) => field && normalizeSearch(field).includes(q)),
    );
  }, [professionals, query]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Buscar profissional por nome, tipo ou documento..."
        resultCount={filtered.length}
        totalCount={professionals.length}
      />
      <ProfessionalsTable professionals={filtered} />
    </div>
  );
}
