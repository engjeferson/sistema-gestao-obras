"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPlanningDependencyByCode, removeGroupedDependency, type PredecessorChip } from "@/server/actions/planejamento";

/**
 * Célula de predecessoras reutilizável tanto pra uma Atividade (owner = ownerTaskId) quanto pra
 * uma Etapa/Sub inteira (owner = ownerStageId) — nesse caso a predecessora passa a valer pra
 * todos os itens dela. `options` vem da árvore já carregada na página (etapas e atividades,
 * rótulo "1.2 — Vigas baldrame") — selecionar chama a mesma action de sempre, resolvida pelo
 * código; o servidor não muda, só a UI de seleção (antes era um input de texto livre).
 */
export function PredecessorsCell({
  workId,
  ownerStageId = null,
  ownerTaskId = null,
  ownCode,
  chips,
  options,
}: {
  workId: string;
  ownerStageId?: string | null;
  ownerTaskId?: string | null;
  ownCode: string;
  chips: PredecessorChip[];
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function updatePosition() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 240) });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
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

  function handleOpen() {
    setOpen(true);
    requestAnimationFrame(updatePosition);
  }

  function handleSelect(option: { value: string; label: string }) {
    startTransition(async () => {
      try {
        await addPlanningDependencyByCode(workId, option.value, ownerStageId, ownerTaskId);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível adicionar.");
      }
    });
    setQuery("");
    inputRef.current?.focus();
  }

  function handleRemove(chip: PredecessorChip) {
    startTransition(async () => {
      await removeGroupedDependency(
        workId,
        chip.type === "stage" ? chip.id : null,
        chip.type === "task" ? chip.id : null,
        ownerStageId,
        ownerTaskId,
      );
      router.refresh();
    });
  }

  const chipCodes = new Set(chips.map((c) => c.codigo));
  const available = options.filter((o) => o.value !== ownCode && !chipCodes.has(o.value));
  const filtered = query.trim()
    ? available.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : available;

  return (
    <div ref={wrapperRef} className="flex flex-wrap items-center gap-1">
      {chips.map((chip) => (
        <span
          key={`${chip.type}-${chip.id}`}
          className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
          title={chip.nome}
        >
          {chip.codigo || chip.nome}
          <button type="button" disabled={isPending} onClick={() => handleRemove(chip)} className="hover:text-destructive">
            <X className="size-3" />
          </button>
        </span>
      ))}

      {open ? (
        <Input
          ref={inputRef}
          value={query}
          autoFocus
          placeholder="Buscar etapa ou atividade..."
          onChange={(e) => {
            setQuery(e.target.value);
            handleOpen();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
          className="h-6 w-40 text-xs"
        />
      ) : (
        <Button size="icon-xs" variant="ghost" onClick={handleOpen} title="Adicionar predecessora">
          <Plus className="size-3" />
        </Button>
      )}

      {open && rect
        ? createPortal(
            <div
              className="fixed z-50 max-h-56 overflow-y-auto rounded-md border bg-popover shadow-md"
              style={{ top: rect.top, left: rect.left, width: rect.width }}
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado.</p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(option)}
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
