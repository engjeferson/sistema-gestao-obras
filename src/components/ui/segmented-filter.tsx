"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SegmentedFilterOption = { value: string; label: string };

/**
 * Grupo de botões (ex.: Todos/Sim/Não) que escreve direto num searchParam —
 * mesmo mecanismo dos outros filtros da tela (PeriodoFilter, TransactionFilters).
 */
export function SegmentedFilter({
  label,
  param,
  options,
}: {
  label: string;
  param: string;
  options: SegmentedFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(param) ?? options[0]?.value ?? "";

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === options[0]?.value) {
      params.delete(param);
    } else {
      params.set(param, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-lg border p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={cn(
              "rounded-md px-3 py-1 text-sm transition-colors",
              active === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
