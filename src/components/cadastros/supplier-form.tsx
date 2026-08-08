"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { supplierCategoryValues } from "@/lib/validations/fornecedores";
import { SUPPLIER_CATEGORY_LABELS } from "@/lib/status-labels";
import type { SupplierModel } from "@/generated/prisma/models";

export function SupplierForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  defaultValues?: Partial<SupplierModel>;
  submitLabel: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Razão social / Nome</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nomeFantasia">Nome fantasia</Label>
          <Input id="nomeFantasia" name="nomeFantasia" defaultValue={defaultValues?.nomeFantasia ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="documento">CPF/CNPJ</Label>
          <Input id="documento" name="documento" defaultValue={defaultValues?.documento ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <NativeSelect id="categoria" name="categoria" defaultValue={defaultValues?.categoria ?? ""}>
            <option value="">—</option>
            {supplierCategoryValues.map((value) => (
              <option key={value} value={value}>
                {SUPPLIER_CATEGORY_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" defaultValue={defaultValues?.telefone ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" name="whatsapp" defaultValue={defaultValues?.whatsapp ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" defaultValue={defaultValues?.endereco ?? ""} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
