"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function EditableName({
  value,
  bold,
  className,
  onCommit,
  autoEdit = false,
  onCancelAutoEdit,
  placeholder,
}: {
  value: string;
  bold?: boolean;
  className?: string;
  onCommit: (value: string) => void;
  /** Nasce já em modo de edição, com foco — usado pra linhas recém-criadas (nome ainda vazio). */
  autoEdit?: boolean;
  /** Chamado quando o usuário cancela (Esc/blur vazio) uma linha que nasceu em `autoEdit`. */
  onCancelAutoEdit?: () => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const trimmed = draft.trim();
          if (trimmed && trimmed !== value) onCommit(trimmed);
          else if (!trimmed && autoEdit) onCancelAutoEdit?.();
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
            if (autoEdit) onCancelAutoEdit?.();
          }
        }}
        className={cn("w-full rounded border px-1 py-0.5 text-xs", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title={value}
      className={cn("w-full truncate text-left hover:underline", bold ? "font-semibold" : "", className)}
    >
      {value}
    </button>
  );
}
