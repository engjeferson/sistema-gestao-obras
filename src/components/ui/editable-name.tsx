"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function EditableName({
  value,
  bold,
  className,
  onCommit,
}: {
  value: string;
  bold?: boolean;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const trimmed = draft.trim();
          if (trimmed && trimmed !== value) onCommit(trimmed);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
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
