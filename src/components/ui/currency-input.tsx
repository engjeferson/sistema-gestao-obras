"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";
import { formatCurrencyBRL } from "@/lib/status-labels";

const MAX_CENTS = 999_999_999_999; // teto de segurança (~R$ 9,99 bilhões)
const ALLOWED_KEYS = ["Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"];

function toCents(value: number | undefined | null): number {
  if (!value) return 0;
  return Math.round(value * 100);
}

/**
 * Campo de valor em reais que formata como moeda enquanto o usuário digita (modelo de
 * "deslocamento de dígito", igual caixa/banco: dígitos entram sempre pela direita, Backspace
 * sempre apaga o último — não depende de posição de cursor no texto formatado). Começa vazio
 * (nunca mostra "R$ 0,00" sozinho).
 *
 * Quando `name` é passado, também renderiza um input hidden com o valor em reais (decimal comum,
 * ex: "1500.5") pra continuar funcionando com formulários não controlados (`FormData` + `z.coerce.number()`)
 * sem precisar mudar nenhuma validação ou server action.
 */
export function CurrencyInput({
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
  id,
  className,
}: {
  name?: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const [cents, setCents] = React.useState(() => toCents(value ?? defaultValue));

  React.useEffect(() => {
    if (value !== undefined) setCents(toCents(value));
  }, [value]);

  function commit(next: number) {
    setCents(next);
    onValueChange?.(next / 100);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || ALLOWED_KEYS.includes(e.key)) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      commit(Math.floor(cents / 10));
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      commit(Math.min(cents * 10 + Number(e.key), MAX_CENTS));
      return;
    }
    e.preventDefault();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    commit(Math.min(Number(digits), MAX_CENTS));
  }

  const display = cents === 0 ? "" : formatCurrencyBRL(cents / 100);

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
        required={required}
        placeholder="R$ 0,00"
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      />
      {name ? <input type="hidden" name={name} value={cents === 0 ? "" : String(cents / 100)} /> : null}
    </>
  );
}
