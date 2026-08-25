"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClientModel } from "@/generated/prisma/models";

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

type Endereco = {
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export function ClientForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  defaultValues?: Partial<ClientModel>;
  submitLabel: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [cep, setCep] = useState(defaultValues?.cep ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [endereco, setEndereco] = useState<Endereco>({
    endereco: defaultValues?.endereco ?? "",
    bairro: defaultValues?.bairro ?? "",
    cidade: defaultValues?.cidade ?? "",
    uf: defaultValues?.uf ?? "",
  });

  async function handleCepChange(value: string) {
    const formatted = formatCep(value);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco({
          endereco: data.logradouro ?? "",
          bairro: data.bairro ?? "",
          cidade: data.localidade ?? "",
          uf: data.uf ?? "",
        });
      }
    } catch {
      // CEP não encontrado ou falha de rede — não bloqueia o formulário, o
      // usuário pode preencher o endereço manualmente.
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="documento">CPF/CNPJ</Label>
          <Input id="documento" name="documento" defaultValue={defaultValues?.documento ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" defaultValue={defaultValues?.telefone ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cep">CEP {buscandoCep ? <span className="text-xs text-muted-foreground">(buscando...)</span> : null}</Label>
          <Input
            id="cep"
            name="cep"
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            name="endereco"
            value={endereco.endereco}
            onChange={(e) => setEndereco((prev) => ({ ...prev, endereco: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" name="numero" defaultValue={defaultValues?.numero ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input id="complemento" name="complemento" defaultValue={defaultValues?.complemento ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            name="bairro"
            value={endereco.bairro}
            onChange={(e) => setEndereco((prev) => ({ ...prev, bairro: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            name="cidade"
            value={endereco.cidade}
            onChange={(e) => setEndereco((prev) => ({ ...prev, cidade: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="uf">UF</Label>
          <Input
            id="uf"
            name="uf"
            maxLength={2}
            value={endereco.uf}
            onChange={(e) => setEndereco((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
          />
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
