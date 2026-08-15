"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Import, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { applyPlanningTemplate } from "@/server/actions/planejamento-templates";

export type TemplateOption = {
  id: string;
  nome: string;
  descricao: string | null;
  stageCount: number;
  taskCount: number;
};

export function ApplyTemplatePicker({ workId, templates }: { workId: string; templates: TemplateOption[] }) {
  const [errorMessage, formAction, isPending] = useActionState(applyPlanningTemplate, undefined);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
      <p className="text-muted-foreground">Nenhuma etapa cadastrada ainda.</p>

      {templates.length > 0 ? (
        <form action={formAction} className="flex w-full max-w-md flex-col items-center gap-3">
          <input type="hidden" name="workId" value={workId} />
          <div className="flex w-full items-center gap-2">
            <LayoutTemplate className="size-4 shrink-0 text-muted-foreground" />
            <NativeSelect name="templateId" required defaultValue="" className="flex-1">
              <option value="" disabled>
                Selecione um template
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.stageCount} etapas, {t.taskCount} atividades)
                </option>
              ))}
            </NativeSelect>
          </div>
          <input type="date" name="dataInicio" required className="w-full rounded border px-2 py-1.5 text-sm" />
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Aplicando..." : "Aplicar template"}
          </Button>
        </form>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>ou</span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        render={<Link href={`/obras/${workId}/planejamento/importar`} />}
        nativeButton={false}
      >
        <Import /> Lançar planejamento do zero
      </Button>
    </div>
  );
}
