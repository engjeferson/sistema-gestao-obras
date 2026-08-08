"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTask } from "@/server/actions/planejamento";

export function AddTaskForm({ workId, stageId }: { workId: string; stageId: string }) {
  const [open, setOpen] = useState(false);
  const [errorMessage, formAction, isPending] = useActionState(createTask, undefined);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus /> Adicionar atividade
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="stageId" value={stageId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Código</label>
        <Input name="codigo" placeholder="02.01" className="w-20" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Atividade</label>
        <Input name="nome" placeholder="Ex: Escavação" required className="w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Início previsto</label>
        <Input name="dataInicioPrevista" type="date" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Fim previsto</label>
        <Input name="dataFimPrevista" type="date" required />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Adicionar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      {errorMessage ? <p className="w-full text-sm text-destructive">{errorMessage}</p> : null}
    </form>
  );
}
