"use client";

import { useMemo, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";
import { BankAccountsTable } from "@/components/cadastros/bank-accounts-table";
import { normalizeSearch } from "@/lib/text";

type BankAccountRow = {
  id: string;
  nome: string;
  banco: string | null;
  tipo: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
  ativo: boolean;
};

export function BankAccountsSearchList({ bankAccounts }: { bankAccounts: BankAccountRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return bankAccounts;
    return bankAccounts.filter((b) =>
      [b.nome, b.banco].some((field) => field && normalizeSearch(field).includes(q)),
    );
  }, [bankAccounts, query]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Buscar conta por nome ou banco..."
        resultCount={filtered.length}
        totalCount={bankAccounts.length}
      />
      <BankAccountsTable bankAccounts={filtered} />
    </div>
  );
}
