"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Combobox } from "@/components/ui/combobox";
import { CONTRACT_TYPE_LABELS } from "@/lib/status-labels";
import { uploadFileToR2 } from "@/lib/upload-file";

type ContractFormDefaultValues = {
  nome?: string;
  tipo?: string;
  direcao?: "PAGAR" | "RECEBER";
  contratanteClientId?: string | null;
  contratado?: string;
  valor?: number | null;
  data?: Date | string;
  observacoes?: string | null;
  arquivoUrl?: string | null;
};

function toDateInputValue(date: Date | string | undefined | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function ContractForm({
  action,
  workId,
  companyName,
  supplierNames,
  clients,
  defaultValues,
  submitLabel = "Criar contrato",
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  workId: string;
  companyName: string;
  supplierNames: string[];
  clients: { id: string; nome: string }[];
  defaultValues?: ContractFormDefaultValues;
  submitLabel?: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(defaultValues?.arquivoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [direcao, setDirecao] = useState<"PAGAR" | "RECEBER">(defaultValues?.direcao ?? "PAGAR");
  const [contratanteClientId, setContratanteClientId] = useState(defaultValues?.contratanteClientId ?? "");
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.nome }));

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const key = await uploadFileToR2(file, "contratos", workId, `novo-${Date.now()}`);
      setArquivoUrl(key);
      toast.success("Arquivo enviado.");
    } catch {
      toast.error("Não foi possível enviar o arquivo. Verifique a configuração de armazenamento.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="arquivoUrl" value={arquivoUrl ?? ""} readOnly />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="nome">Nome do contrato</Label>
          <Input id="nome" name="nome" defaultValue={defaultValues?.nome} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <NativeSelect id="tipo" name="tipo" defaultValue={defaultValues?.tipo ?? "CONTRATO_CLIENTE"}>
            {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="direcao">Tipo de lançamento</Label>
          <NativeSelect
            id="direcao"
            name="direcao"
            value={direcao}
            onChange={(e) => setDirecao(e.target.value as "PAGAR" | "RECEBER")}
          >
            <option value="PAGAR">Despesa (nós pagamos)</option>
            <option value="RECEBER">Receita (nós recebemos)</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" defaultValue={toDateInputValue(defaultValues?.data)} required />
        </div>
        {direcao === "RECEBER" ? (
          <div key="contratante-cliente" className="flex flex-col gap-2">
            <Label htmlFor="contratanteClientId">Contratante</Label>
            <Combobox
              value={contratanteClientId}
              onChange={setContratanteClientId}
              options={clientOptions}
              placeholder="Buscar cliente cadastrado..."
              emptyMessage="Nenhum cliente encontrado."
            />
            <input type="hidden" name="contratanteClientId" value={contratanteClientId} />
            <Link href="/cadastros/clientes/novo" target="_blank" className="text-xs text-muted-foreground underline">
              Cliente não encontrado? Cadastrar novo cliente
            </Link>
          </div>
        ) : (
          <div key="contratante-empresa" className="flex flex-col gap-2">
            <Label htmlFor="contratante">Contratante</Label>
            <Input id="contratante" value={companyName} disabled />
          </div>
        )}
        {direcao === "PAGAR" ? (
          <div key="contratado-fornecedor" className="flex flex-col gap-2">
            <Label htmlFor="contratadoNome">Contratado</Label>
            <Input
              id="contratadoNome"
              name="contratadoNome"
              list="fornecedores-datalist"
              defaultValue={defaultValues?.contratado}
              required
            />
            <datalist id="fornecedores-datalist">
              {supplierNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Selecione um fornecedor já cadastrado ou digite um nome novo — o cadastro é criado automaticamente.
            </p>
          </div>
        ) : (
          <div key="contratado-empresa" className="flex flex-col gap-2">
            <Label htmlFor="contratado">Contratado</Label>
            <Input id="contratado" value={companyName} disabled />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <CurrencyInput id="valor" name="valor" defaultValue={defaultValues?.valor ?? undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="arquivo">Arquivo PDF</Label>
          <Input
            id="arquivo"
            type="file"
            accept="application/pdf"
            disabled={uploading}
            onChange={(e) => void handleFileChange(e.target.files?.[0])}
          />
          {uploading ? <p className="text-xs text-muted-foreground">Enviando...</p> : null}
          {arquivoUrl ? <p className="text-xs text-success">Arquivo anexado.</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
