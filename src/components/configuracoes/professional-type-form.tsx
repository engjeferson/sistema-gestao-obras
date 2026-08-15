"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProfessionalType } from "@/server/actions/tipos-profissional";

export function ProfessionalTypeForm() {
  const [errorMessage, formAction, isPending] = useActionState(createProfessionalType, undefined);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-2">
        <Input name="nome" placeholder="Nome do tipo (ex: Engenheiro, Empreiteiro)" required />
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus /> Novo tipo
      </Button>
    </form>
  );
}
