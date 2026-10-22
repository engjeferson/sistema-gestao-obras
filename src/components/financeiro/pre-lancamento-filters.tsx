"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { PeriodoFilter } from "@/components/ui/periodo-filter";

export function PreLancamentoFilters({ works }: { works: { id: string; nome: string; codigo: string }[] }) {
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
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("workId") ?? ""}
        onChange={(e) => setParam("workId", e.target.value)}
      >
        <option value="">Todos os centros de custo</option>
        {works.map((work) => (
          <option key={work.id} value={work.id}>
            {work.codigo} — {work.nome}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("tipo") ?? ""}
        onChange={(e) => setParam("tipo", e.target.value)}
      >
        <option value="">Pagar e receber</option>
        <option value="PAGAR">A pagar (fornecedor)</option>
        <option value="RECEBER">A receber (cliente)</option>
      </NativeSelect>
      <PeriodoFilter inicioLabel="Vencimento de" fimLabel="Vencimento até" />
    </div>
  );
}
