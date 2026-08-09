"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StockBalanceTable, type BalanceRow } from "@/components/estoque/stock-balance-table";

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function StockBalanceSearch({ balances }: { balances: BalanceRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return balances;
    return balances.filter((b) => normalize(b.materialNome).includes(q));
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
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar material... ex: tinta, lixa, revestimento"
          className="pl-9"
        />
      </div>
      {query ? (
        <p className="text-xs text-muted-foreground">
          {filtered.length} de {balances.length} materiais
        </p>
      ) : null}
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
