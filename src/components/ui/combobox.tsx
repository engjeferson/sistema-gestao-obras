"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  emptyMessage = "Nenhum resultado.",
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  function updatePosition() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  function handleOpen() {
    updatePosition();
    setOpen(true);
  }

  // O dropdown é renderizado num portal (fixed, posição calculada aqui) pra
  // não ficar preso pelo overflow-x-auto de containers como a tabela de
  // itens da transferência — combinar overflow-x:auto com overflow-y:visible
  // faz o navegador tratar o y como auto também, cortando o dropdown.
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function select(option: ComboboxOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          handleOpen();
          if (value) onChange("");
        }}
        onFocus={handleOpen}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            setQuery(selectedLabel);
          }, 150);
        }}
      />
      {open && rect
        ? createPortal(
            <div
              className="fixed z-50 max-h-64 overflow-y-auto rounded-md border bg-popover shadow-md"
              style={{ top: rect.top, left: rect.left, width: rect.width }}
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(option)}
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
