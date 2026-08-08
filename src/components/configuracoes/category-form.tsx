"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFinancialCategory } from "@/server/actions/financeiro";

export function CategoryForm() {
  const [errorMessage, formAction, isPending] = useActionState(createFinancialCategory, undefined);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-2">
        <Input name="nome" placeholder="Nome da categoria" required />
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus /> Nova categoria
      </Button>
    </form>
  );
}
