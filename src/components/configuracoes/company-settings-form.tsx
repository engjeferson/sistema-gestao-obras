"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { updateCompanySettings } from "@/server/actions/empresa";
import { UF_CODES } from "@/lib/sefaz/uf-codes";

type CompanySettingsValues = {
  nome: string;
  cnpj: string | null;
  uf: string | null;
  endereco: string | null;
  telefone: string | null;
};

export function CompanySettingsForm({ settings }: { settings: CompanySettingsValues }) {
  const [errorMessage, formAction, isPending] = useActionState(updateCompanySettings, undefined);
  const ufOptions = Object.keys(UF_CODES).sort();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome da empresa</Label>
          <Input id="nome" name="nome" defaultValue={settings.nome} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" name="cnpj" defaultValue={settings.cnpj ?? ""} placeholder="00.000.000/0000-00" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="uf">UF</Label>
          <NativeSelect id="uf" name="uf" defaultValue={settings.uf ?? ""}>
            <option value="">—</option>
            {ufOptions.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" defaultValue={settings.telefone ?? ""} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" defaultValue={settings.endereco ?? ""} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CNPJ e UF são usados pelo Radar de NF-e para consultar notas emitidas contra a empresa na SEFAZ.
      </p>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
