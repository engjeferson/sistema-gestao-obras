"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

const MAX_CENTESIMOS = 999_999_999_999;
const ALLOWED_KEYS = ["Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"];

function toCentesimos(value: number | undefined | null): number {
  if (!value) return 0;
  return Math.round(value * 100);
}

function formatArea(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} m²`;
}

/**
 * Campo de área (m²) com o mesmo comportamento de "deslocamento de dígito"
 * do CurrencyInput (dígitos entram sempre pela direita, Backspace sempre
 * apaga o último), só que formatando em m² com casas decimais em vez de
 * moeda. Começa vazio.
 */
export function AreaInput({
  name,
  value,
  defaultValue,
  onValueChange,
  disabled,
  id,
  className,
}: {
  name?: string;
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const [centesimos, setCentesimos] = React.useState(() => toCentesimos(value ?? defaultValue));

  React.useEffect(() => {
    if (value !== undefined) setCentesimos(toCentesimos(value));
  }, [value]);

  function commit(next: number) {
    setCentesimos(next);
    onValueChange?.(next / 100);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || ALLOWED_KEYS.includes(e.key)) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      commit(Math.floor(centesimos / 10));
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      commit(Math.min(centesimos * 10 + Number(e.key), MAX_CENTESIMOS));
      return;
    }
    e.preventDefault();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    commit(Math.min(Number(digits), MAX_CENTESIMOS));
  }

  const display = centesimos === 0 ? "" : formatArea(centesimos / 100);

  return (
    <>
      <InputPrimitive
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        data-slot="input"
        value={display}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={disabled}
        placeholder="0,00 m²"
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      />
      {name ? <input type="hidden" name={name} value={centesimos === 0 ? "" : String(centesimos / 100)} /> : null}
    </>
  );
}
