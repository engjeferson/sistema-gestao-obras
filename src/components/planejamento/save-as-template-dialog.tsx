"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveWorkPlanningAsTemplate } from "@/server/actions/planejamento-templates";

export function SaveAsTemplateButton({ workId }: { workId: string }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errorMessage, formAction, isPending] = useActionState(async (_prev: string | undefined, formData: FormData) => {
    const result = await saveWorkPlanningAsTemplate(_prev, formData);
    if (!result) {
      toast.success("Template salvo.");
      setOpen(false);
      setNome("");
      setDescricao("");
    }
    return result;
  }, undefined);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <LayoutTemplate /> Salvar como template
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
      <input type="hidden" name="workId" value={workId} />
      <Input
        name="nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do template"
        className="h-8 w-48"
        required
      />
      <Input
        name="descricao"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição (opcional)"
        className="h-8 w-56"
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </form>
  );
}
