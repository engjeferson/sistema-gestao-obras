"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PredecessorOption = { value: string; label: string };

/**
 * Multi-seleção com busca pra predecessoras — mesma técnica de portal do
 * Combobox (src/components/ui/combobox.tsx) pra não ficar cortado por
 * containers com overflow, mas com seleção múltipla em vez de única (o
 * Combobox não serve aqui por ser single-value).
 */
export function PredecessorPicker({
  value,
  onChange,
  options,
  className,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: PredecessorOption[];
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
  }

  function handleOpen() {
    updatePosition();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selecionados = options.filter((o) => value.includes(o.value));
  const disponiveis = options.filter((o) => !value.includes(o.value));
  const filtrados = query.trim()
    ? disponiveis.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : disponiveis;

  function add(option: PredecessorOption) {
    onChange([...value, option.value]);
    setQuery("");
  }

  function remove(optionValue: string) {
    onChange(value.filter((v) => v !== optionValue));
  }

  return (
    <div ref={wrapperRef} className={cn("relative flex min-w-[160px] flex-col gap-1", className)}>
      {selecionados.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selecionados.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground"
            >
              {o.label}
              <button type="button" onClick={() => remove(o.value)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Input
        ref={inputRef}
        value={query}
        placeholder="Buscar atividade..."
        onChange={(e) => {
          setQuery(e.target.value);
          handleOpen();
        }}
        onFocus={handleOpen}
        className="h-7 text-xs"
      />
      {open && rect
        ? createPortal(
            <div
              className="fixed z-50 max-h-56 overflow-y-auto rounded-md border bg-popover shadow-md"
              style={{ top: rect.top, left: rect.left, width: rect.width }}
            >
              {filtrados.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {disponiveis.length === 0 ? "Nenhuma atividade disponível." : "Nenhum resultado."}
                </p>
              ) : (
                filtrados.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(option)}
                    className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
