"use client";

import { useMemo, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";
import { ClientsTable } from "@/components/cadastros/clients-table";
import { normalizeSearch } from "@/lib/text";

type ClientRow = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
};

export function ClientsSearchList({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return clients;
    return clients.filter((c) =>
      [c.nome, c.documento, c.email, c.telefone].some((field) => field && normalizeSearch(field).includes(q)),
    );
  }, [clients, query]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Buscar cliente por nome, documento, e-mail ou telefone..."
        resultCount={filtered.length}
        totalCount={clients.length}
      />
      <ClientsTable clients={filtered} />
    </div>
  );
}
