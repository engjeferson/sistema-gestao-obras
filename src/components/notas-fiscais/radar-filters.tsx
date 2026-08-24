"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { PeriodoFilter } from "@/components/ui/periodo-filter";
import { SegmentedFilter } from "@/components/ui/segmented-filter";

const SIM_NAO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

export function RadarFilters() {
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
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">Todas as situações</option>
        <option value="PENDENTE">Nova</option>
        <option value="LANCADA">Lançada</option>
        <option value="IGNORADA">Ignorada</option>
      </NativeSelect>
      <PeriodoFilter inicioLabel="Emissão de" fimLabel="Emissão até" />
      <SegmentedFilter label="OE Vinculada" param="oeVinculada" options={SIM_NAO_OPTIONS} />
      <SegmentedFilter label="NF-e Completa" param="nfeCompleta" options={SIM_NAO_OPTIONS} />
    </div>
  );
}
