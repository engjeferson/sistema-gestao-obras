"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createUser } from "@/server/actions/usuarios";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  ENGENHEIRO: "Engenheiro",
  FINANCEIRO: "Financeiro",
  OBRA: "Obra (campo)",
};

export function UserForm() {
  const [errorMessage, formAction, isPending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required minLength={6} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Perfil</Label>
          <NativeSelect id="role" name="role" defaultValue="ENGENHEIRO">
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar usuário"}
        </Button>
      </div>
    </form>
  );
}
