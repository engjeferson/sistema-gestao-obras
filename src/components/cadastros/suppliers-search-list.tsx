"use client";

import { useMemo, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";
import { SuppliersTable } from "@/components/cadastros/suppliers-table";
import { normalizeSearch } from "@/lib/text";

type SupplierRow = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  categoria: string | null;
  ativo: boolean;
};

export function SuppliersSearchList({ suppliers }: { suppliers: SupplierRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.nome, s.documento, s.email, s.telefone].some((field) => field && normalizeSearch(field).includes(q)),
    );
  }, [suppliers, query]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Buscar fornecedor por nome, documento, e-mail ou telefone..."
        resultCount={filtered.length}
        totalCount={suppliers.length}
      />
      <SuppliersTable suppliers={filtered} />
    </div>
  );
}
