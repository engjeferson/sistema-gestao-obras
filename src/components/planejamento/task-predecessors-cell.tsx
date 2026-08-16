"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addPlanningDependency, removePlanningDependency } from "@/server/actions/planejamento";
import type { TaskOption } from "@/components/planejamento/stage-list";

export type PredecessorLink = { dependencyId: string; taskId: string; codigo: string | null; nome: string };

export function TaskPredecessorsCell({
  taskId,
  workId,
  predecessors,
  allTasks,
}: {
  taskId: string;
  workId: string;
  predecessors: PredecessorLink[];
  allTasks: TaskOption[];
}) {
  const [open, setOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    const trimmed = codeInput.trim();
    if (!trimmed) return;

    const match = allTasks.find((t) => t.codigo === trimmed);
    if (!match) {
      setError("Código não encontrado.");
      return;
    }
    if (match.id === taskId) {
      setError("Um item não pode ser predecessor dele mesmo.");
      return;
    }
    if (predecessors.some((p) => p.taskId === match.id)) {
      setError("Essa predecessora já foi adicionada.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await addPlanningDependency(match.id, taskId, workId);
        toast.success("Predecessora adicionada.");
        setOpen(false);
        setCodeInput("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível adicionar.");
      }
    });
  }

  function handleRemove(dependencyId: string) {
    startTransition(async () => {
      await removePlanningDependency(dependencyId, workId);
      toast.success("Predecessora removida.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {predecessors.map((p) => (
        <span
          key={p.dependencyId}
          className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
        >
          {p.codigo ?? p.nome}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleRemove(p.dependencyId)}
            className="hover:text-destructive"
          >
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
              placeholder="Código (ex: 2.1)"
              className="h-6 w-24 rounded border px-1.5 text-xs"
            />
            <Button size="icon-xs" variant="ghost" disabled={isPending || !codeInput.trim()} onClick={handleAdd}>
              <Plus className="size-3" />
            </Button>
          </div>
          {error ? <span className="text-[0.65rem] text-destructive">{error}</span> : null}
        </div>
      ) : (
        <Button size="icon-xs" variant="ghost" onClick={() => setOpen(true)} title="Adicionar predecessora pelo código">
          <Plus className="size-3" />
        </Button>
      )}
    </div>
  );
}
