"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "@/components/ui/combobox";

export function MultiCombobox({
  values,
  onChange,
  options,
  placeholder,
  emptyMessage = "Nenhum resultado.",
  className,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.filter((o) => values.includes(o.value));
  const availableOptions = options.filter((o) => !values.includes(o.value));

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

  // Mesmo motivo do Combobox: portal fixed pra não ser cortado por containers com overflow-x.
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
    ? availableOptions.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : availableOptions;

  function select(option: ComboboxOption) {
    onChange([...values, option.value]);
    setQuery("");
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => (
            <span
              key={option.value}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              {option.label}
              <button
                type="button"
                onClick={() => remove(option.value)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            handleOpen();
          }}
          onFocus={handleOpen}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
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
    </div>
  );
}
