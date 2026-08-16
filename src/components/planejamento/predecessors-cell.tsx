"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addPlanningDependencyByCode, removeGroupedDependency, type PredecessorChip } from "@/server/actions/planejamento";

/**
 * Célula de predecessoras reutilizável tanto pra um Item (owner = ownerTaskId) quanto pra uma
 * Etapa/Sub inteira (owner = ownerStageId) — nesse caso a predecessora passa a valer pra todos
 * os itens dela. A predecessora digitada também pode ser um código de etapa/sub (ex: "1") ou
 * de item (ex: "1.1") — resolvido no servidor.
 */
export function PredecessorsCell({
  workId,
  ownerStageId = null,
  ownerTaskId = null,
  chips,
}: {
  workId: string;
  ownerStageId?: string | null;
  ownerTaskId?: string | null;
  chips: PredecessorChip[];
}) {
  const [open, setOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    const trimmed = codeInput.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await addPlanningDependencyByCode(workId, trimmed, ownerStageId, ownerTaskId);
        toast.success("Predecessora adicionada.");
        setOpen(false);
        setCodeInput("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível adicionar.");
      }
    });
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
      toast.success("Predecessora removida.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Código (etapa ou item)"
              className="h-6 w-28 rounded border px-1.5 text-xs"
            />
            <Button size="icon-xs" variant="ghost" disabled={isPending || !codeInput.trim()} onClick={handleAdd}>
              <Plus className="size-3" />
            </Button>
          </div>
          {error ? <span className="text-[0.65rem] text-destructive">{error}</span> : null}
        </div>
      ) : (
        <Button size="icon-xs" variant="ghost" onClick={() => setOpen(true)} title="Adicionar predecessora (etapa ou item, pelo código)">
          <Plus className="size-3" />
        </Button>
      )}
    </div>
  );
}
