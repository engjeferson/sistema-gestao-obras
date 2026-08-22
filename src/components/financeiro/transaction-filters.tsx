"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { PeriodoFilter } from "@/components/ui/periodo-filter";
import { TRANSACTION_STATUS_LABELS } from "@/lib/status-labels";

export function TransactionFilters({
  categorias,
  favorecidos = [],
}: {
  categorias: { id: string; nome: string }[];
  favorecidos?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [favorecidoInput, setFavorecidoInput] = useState(searchParams.get("favorecido") ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const suggestions = useMemo(() => {
    const q = favorecidoInput.trim().toLowerCase();
    if (!q) return [];
    return favorecidos.filter((nome) => nome.toLowerCase().includes(q)).slice(0, 8);
  }, [favorecidoInput, favorecidos]);

  function selectFavorecido(nome: string) {
    setFavorecidoInput(nome);
    setShowSuggestions(false);
    setParam("favorecido", nome);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">Todos os status</option>
        <option value="EM_ABERTO">Em aberto (pendente + vencido)</option>
        {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("categoriaId") ?? ""}
        onChange={(e) => setParam("categoriaId", e.target.value)}
      >
        <option value="">Todas as categorias</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nome}
          </option>
        ))}
      </NativeSelect>
      <div className="relative w-80">
        <Input
          placeholder="Fornecedor / cliente"
          className="w-full"
          value={favorecidoInput}
          onChange={(e) => {
            setFavorecidoInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={(e) => {
            setShowSuggestions(false);
            setParam("favorecido", e.target.value);
          }}
        />
        {showSuggestions && suggestions.length > 0 ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {suggestions.map((nome) => (
              <button
                key={nome}
                type="button"
                className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectFavorecido(nome)}
              >
                {nome}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <PeriodoFilter inicioLabel="Vencimento de" fimLabel="Vencimento até" />
    </div>
  );
}
