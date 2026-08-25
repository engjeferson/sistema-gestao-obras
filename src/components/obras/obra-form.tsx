"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Combobox } from "@/components/ui/combobox";
import { WorkRenderUploader } from "@/components/obras/work-render-uploader";
import { WORK_STATUS_LABELS } from "@/lib/status-labels";
import type { WorkModel } from "@/generated/prisma/models";

type ObraFormDefaultValues = Partial<Omit<WorkModel, "valorContrato" | "areaConstruida">> & {
  valorContrato?: number;
  areaConstruida?: number | null;
};

type ClientOption = {
  id: string;
  nome: string;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

type ObraFormProps = {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  defaultValues?: ObraFormDefaultValues;
  submitLabel: string;
  professionals: { id: string; nome: string; tipo: { nome: string } }[];
  clients: ClientOption[];
  renderPreviewUrl?: string | null;
};

function isEngenheiro(tipoNome: string) {
  return tipoNome.toLowerCase().includes("engenheiro");
}

function formatEnderecoCompleto(client: ClientOption | undefined): string {
  if (!client) return "";
  const linha1 = [client.endereco, client.numero].filter(Boolean).join(", ");
  const linha2 = [client.complemento, client.bairro].filter(Boolean).join(" - ");
  const cidadeUf = [client.cidade, client.uf].filter(Boolean).join("/");
  return [linha1, linha2, cidadeUf].filter(Boolean).join(" - ");
}

function toDateInputValue(date: Date | string | undefined | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function ObraForm({
  action,
  defaultValues,
  submitLabel,
  professionals,
  clients,
  renderPreviewUrl,
}: ObraFormProps) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [clientId, setClientId] = useState(defaultValues?.clientId ?? "");
  const [endereco, setEndereco] = useState(defaultValues?.endereco ?? "");
  const engenheiros = professionals.filter((p) => isEngenheiro(p.tipo.nome));
  const naoEngenheiros = professionals.filter((p) => !isEngenheiro(p.tipo.nome));
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.nome }));

  function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    const client = clients.find((c) => c.id === newClientId);
    const enderecoCliente = formatEnderecoCompleto(client);
    if (enderecoCliente) setEndereco(enderecoCliente);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome da obra</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} required />
        </div>
        {defaultValues?.id ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" name="codigo" defaultValue={defaultValues?.codigo} required />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientId">Cliente</Label>
          <Combobox
            value={clientId}
            onChange={handleClientChange}
            options={clientOptions}
            placeholder="Buscar cliente cadastrado..."
            emptyMessage="Nenhum cliente encontrado."
          />
          <input type="hidden" name="clientId" value={clientId} />
          <Link href="/cadastros/clientes/novo" target="_blank" className="text-xs text-muted-foreground underline">
            Cliente não encontrado? Cadastrar novo cliente
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="responsavelTecnicoId">Responsável técnico</Label>
          <NativeSelect
            id="responsavelTecnicoId"
            name="responsavelTecnicoId"
            defaultValue={defaultValues?.responsavelTecnicoId ?? ""}
          >
            <option value="">Não definido</option>
            {engenheiros.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="encarregadoId">Encarregado</Label>
          <NativeSelect id="encarregadoId" name="encarregadoId" defaultValue={defaultValues?.encarregadoId ?? ""}>
            <option value="">Não definido</option>
            {naoEngenheiros.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valorContrato">Valor do contrato (R$)</Label>
          <CurrencyInput id="valorContrato" name="valorContrato" defaultValue={defaultValues?.valorContrato} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="areaConstruida">Área construída (m²)</Label>
          <Input
            id="areaConstruida"
            name="areaConstruida"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.areaConstruida?.toString() ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataInicio">Data de início</Label>
          <Input
            id="dataInicio"
            name="dataInicio"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataInicio)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataPrevistaTermino">Data prevista de término</Label>
          <Input
            id="dataPrevistaTermino"
            name="dataPrevistaTermino"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataPrevistaTermino)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={defaultValues?.status ?? "PLANEJAMENTO"}>
            {Object.entries(WORK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
        {defaultValues?.id ? (
          <div className="sm:col-span-2">
            <WorkRenderUploader
              workId={defaultValues.id}
              defaultKey={defaultValues.renderUrl}
              defaultPreviewUrl={renderPreviewUrl}
            />
          </div>
        ) : null}
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
