"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStage } from "@/server/actions/planejamento";

export function AddStageForm({
  workId,
  parentId,
  label = "Nova etapa",
  compact = false,
}: {
  workId: string;
  parentId?: string;
  label?: string;
  compact?: boolean;
}) {
  const [errorMessage, formAction, isPending] = useActionState(createStage, undefined);

  if (compact) {
    return (
      <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <input type="hidden" name="workId" value={workId} />
        {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
        <Input name="codigo" placeholder="Código (auto)" className="w-28" />
        <Input name="nome" placeholder="Nome da sub" required className="w-48" />
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          <Plus /> {label}
        </Button>
        {errorMessage ? <p className="w-full text-sm text-destructive">{errorMessage}</p> : null}
      </form>
    );
  }

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="workId" value={workId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <div className="flex w-24 flex-col gap-2">
        <Input name="codigo" placeholder="Código" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Input name="nome" placeholder="Nome da etapa (ex: Fundação)" required />
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus /> {label}
      </Button>
    </form>
  );
}
