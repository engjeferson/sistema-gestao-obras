"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStage } from "@/server/actions/planejamento";

export function AddStageForm({ workId }: { workId: string }) {
  const [errorMessage, formAction, isPending] = useActionState(createStage, undefined);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="workId" value={workId} />
      <div className="flex w-24 flex-col gap-2">
        <Input name="codigo" placeholder="Código" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Input name="nome" placeholder="Nome da etapa (ex: Fundação)" required />
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus /> Nova etapa
      </Button>
    </form>
  );
}
