"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
  { value: "TRANSFERENCIA", label: "Transferência" },
];

export function StockMovementsFilters({ suppliers }: { suppliers: { id: string; nome: string }[] }) {
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
        defaultValue={searchParams.get("tipo") ?? ""}
        onChange={(e) => setParam("tipo", e.target.value)}
      >
        <option value="">Todos os tipos</option>
        {TIPO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("supplierId") ?? ""}
        onChange={(e) => setParam("supplierId", e.target.value)}
      >
        <option value="">Todos os fornecedores</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.nome}
          </option>
        ))}
      </NativeSelect>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          className="w-auto"
          aria-label="Data de"
          defaultValue={searchParams.get("dataInicio") ?? ""}
          onChange={(e) => setParam("dataInicio", e.target.value)}
        />
        <span className="text-sm text-muted-foreground">até</span>
        <Input
          type="date"
          className="w-auto"
          aria-label="Data até"
          defaultValue={searchParams.get("dataFim") ?? ""}
          onChange={(e) => setParam("dataFim", e.target.value)}
        />
      </div>
    </div>
  );
}
