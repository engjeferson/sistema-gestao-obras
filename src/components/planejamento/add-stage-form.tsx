"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createStage } from "@/server/actions/planejamento";
import type { PlainStage } from "@/components/planejamento/stage-list";

export function flattenStageOptions(stages: PlainStage[], depth = 0): { id: string; label: string }[] {
  return stages.flatMap((stage) => [
    { id: stage.id, label: `${"— ".repeat(depth)}${stage.codigo} ${stage.nome}` },
    ...flattenStageOptions(stage.children, depth + 1),
  ]);
}

// Único jeito de criar etapa/sub: a lista de etapas já existentes aparece no seletor de pai.
export function AddStageForm({ workId, stages }: { workId: string; stages: PlainStage[] }) {
  const [errorMessage, formAction, isPending] = useActionState(createStage, undefined);
  const options = flattenStageOptions(stages);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="workId" value={workId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Nome</label>
        <Input name="nome" placeholder="Nome da etapa" required className="w-56" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Etapa pai (opcional)</label>
        <NativeSelect name="parentId" defaultValue="" className="w-56">
          <option value="">— Nível superior —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus /> {isPending ? "Salvando..." : "Nova etapa"}
      </Button>
      {errorMessage ? <p className="w-full text-sm text-destructive">{errorMessage}</p> : null}
    </form>
  );
}
