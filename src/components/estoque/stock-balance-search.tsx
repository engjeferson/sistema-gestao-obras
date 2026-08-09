"use client";

import { useMemo, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";
import { StockBalanceTable, type BalanceRow } from "@/components/estoque/stock-balance-table";
import { normalizeSearch } from "@/lib/text";

export function StockBalanceSearch({ balances }: { balances: BalanceRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return balances;
    return balances.filter((b) => normalizeSearch(b.materialNome).includes(q));
  }, [balances, query]);

  if (balances.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma movimentação neste local ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Buscar material... ex: tinta, lixa, revestimento"
        resultCount={filtered.length}
        totalCount={balances.length}
      />
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhum material encontrado para &quot;{query}&quot;.
        </p>
      ) : (
        <StockBalanceTable balances={filtered} />
      )}
    </div>
  );
}
