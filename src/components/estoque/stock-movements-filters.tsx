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

const TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
  { value: "TRANSFERENCIA", label: "Transferência" },
];

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

export function StockMovementsFilters({ suppliers }: { suppliers: { id: string; nome: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [periodo, setPeriodo] = useState(searchParams.get("periodo") ?? "tudo");

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
      setParams({ periodo: value });
      return;
    }
    const { dataInicio, dataFim } = periodoRange(value);
    setParams({ periodo: value === "tudo" ? undefined : value, dataInicio, dataFim });
  }

  return (
    <div className="flex flex-wrap gap-3">
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
            aria-label="Data de"
            defaultValue={searchParams.get("dataInicio") ?? ""}
            onChange={(e) => setParams({ dataInicio: e.target.value })}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            className="w-auto"
            aria-label="Data até"
            defaultValue={searchParams.get("dataFim") ?? ""}
            onChange={(e) => setParams({ dataFim: e.target.value })}
          />
        </div>
      ) : null}
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("tipo") ?? ""}
        onChange={(e) => setParams({ tipo: e.target.value })}
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
        onChange={(e) => setParams({ supplierId: e.target.value })}
      >
        <option value="">Todos os fornecedores</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.nome}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
