"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FinancePermissionsFields } from "@/components/configuracoes/finance-permissions-fields";
import type { FinancePermissions } from "@/lib/finance-permissions";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  ENGENHEIRO: "Engenheiro",
  FINANCEIRO: "Financeiro",
  OBRA: "Obra (campo)",
};

export function UserEditForm({
  action,
  defaultValues,
  categorias,
  financePermissions,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  defaultValues: { name: string; email: string; role: string };
  categorias: { id: string; nome: string }[];
  financePermissions: FinancePermissions;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={defaultValues.name} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues.email} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={6}
            placeholder="Deixe em branco para manter a atual"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Perfil</Label>
          <NativeSelect id="role" name="role" defaultValue={defaultValues.role}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <FinancePermissionsFields categorias={categorias} defaultValues={financePermissions} />
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
