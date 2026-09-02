"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUnit } from "@/server/actions/unidades";

export function UnitForm() {
  const [errorMessage, formAction, isPending] = useActionState(createUnit, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Input name="sigla" placeholder="Sigla (ex: rolo)" required className="w-32" />
        <Input name="nome" placeholder="Nome (opcional, ex: Rolo de 5m)" className="flex-1" />
        <Button type="submit" disabled={isPending}>
          <Plus /> Nova unidade
        </Button>
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </form>
  );
}
