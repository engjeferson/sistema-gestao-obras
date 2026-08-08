"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
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
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const usedIds = new Set([taskId, ...predecessors.map((p) => p.taskId)]);
  const options = allTasks.filter((t) => !usedIds.has(t.id));

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await addPlanningDependency(selected, taskId, workId);
        toast.success("Predecessora adicionada.");
        setOpen(false);
        setSelected("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível adicionar.");
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
        <div className="flex items-center gap-1">
          <NativeSelect
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-6 text-xs"
          >
            <option value="">Selecione...</option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo ? `${t.codigo} — ` : ""}
                {t.nome}
              </option>
            ))}
          </NativeSelect>
          <Button size="icon-xs" variant="ghost" disabled={isPending || !selected} onClick={handleAdd}>
            <Plus className="size-3" />
          </Button>
        </div>
      ) : (
        <Button size="icon-xs" variant="ghost" onClick={() => setOpen(true)} title="Adicionar predecessora">
          <Plus className="size-3" />
        </Button>
      )}
    </div>
  );
}
