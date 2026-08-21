"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { PeriodoFilter } from "@/components/ui/periodo-filter";
import { TRANSACTION_STATUS_LABELS } from "@/lib/status-labels";

export function TransactionFilters({
  categorias,
}: {
  categorias: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
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
      <Input
        placeholder="Fornecedor / cliente"
        className="w-auto"
        defaultValue={searchParams.get("favorecido") ?? ""}
        onBlur={(e) => setParam("favorecido", e.target.value)}
      />
      <PeriodoFilter inicioLabel="Vencimento de" fimLabel="Vencimento até" />
    </div>
  );
}
