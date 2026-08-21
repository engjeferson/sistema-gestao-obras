"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const PERIODO_OPTIONS: { value: string; label: string }[] = [
  { value: "tudo", label: "Tudo" },
  { value: "mes", label: "Este mês" },
  { value: "trimestre", label: "Este trimestre" },
  { value: "semestre", label: "Este semestre" },
  { value: "ano", label: "Este ano" },
  { value: "personalizado", label: "Data personalizada" },
];

function fmt(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function periodoRange(periodo: string): { dataInicio?: string; dataFim?: string } {
  const hoje = new Date();
  switch (periodo) {
    case "mes":
      return { dataInicio: fmt(startOfMonth(hoje)), dataFim: fmt(endOfMonth(hoje)) };
    case "trimestre":
      return { dataInicio: fmt(startOfQuarter(hoje)), dataFim: fmt(endOfQuarter(hoje)) };
    case "semestre": {
      const semestreStart = hoje.getMonth() < 6 ? new Date(hoje.getFullYear(), 0, 1) : new Date(hoje.getFullYear(), 6, 1);
      const semestreEnd = hoje.getMonth() < 6 ? new Date(hoje.getFullYear(), 5, 30) : new Date(hoje.getFullYear(), 11, 31);
      return { dataInicio: fmt(semestreStart), dataFim: fmt(semestreEnd) };
    }
    case "ano":
      return { dataInicio: fmt(startOfYear(hoje)), dataFim: fmt(endOfYear(hoje)) };
    default:
      return {};
  }
}

/**
 * Filtro rápido de período (Tudo/Mês/Trimestre/Semestre/Ano/Data personalizada)
 * pra qualquer lista com filtro de data — escreve direto nos searchParams via router.push.
 * Reaproveitado em Financeiro e Estoque > Movimentações.
 */
export function PeriodoFilter({
  periodoParam = "periodo",
  inicioParam = "dataInicio",
  fimParam = "dataFim",
  inicioLabel = "Data de",
  fimLabel = "Data até",
}: {
  periodoParam?: string;
  inicioParam?: string;
  fimParam?: string;
  inicioLabel?: string;
  fimLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [periodo, setPeriodo] = useState(searchParams.get(periodoParam) ?? "tudo");

  function setParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePeriodoChange(value: string) {
    setPeriodo(value);
    if (value === "personalizado") {
      setParams({ [periodoParam]: value });
      return;
    }
    const { dataInicio, dataFim } = periodoRange(value);
    setParams({ [periodoParam]: value === "tudo" ? undefined : value, [inicioParam]: dataInicio, [fimParam]: dataFim });
  }

  return (
    <>
      <NativeSelect className="w-auto" value={periodo} onChange={(e) => handlePeriodoChange(e.target.value)}>
        {PERIODO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      {periodo === "personalizado" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-auto"
            aria-label={inicioLabel}
            defaultValue={searchParams.get(inicioParam) ?? ""}
            onChange={(e) => setParams({ [inicioParam]: e.target.value })}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            className="w-auto"
            aria-label={fimLabel}
            defaultValue={searchParams.get(fimParam) ?? ""}
            onChange={(e) => setParams({ [fimParam]: e.target.value })}
          />
        </div>
      ) : null}
    </>
  );
}
