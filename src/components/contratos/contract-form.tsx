"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { CONTRACT_TYPE_LABELS } from "@/lib/status-labels";
import { uploadFileToR2 } from "@/lib/upload-file";

export function ContractForm({
  action,
  workId,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  workId: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
          <Input id="nome" name="nome" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <NativeSelect id="tipo" name="tipo" defaultValue="CONTRATO_CLIENTE">
            {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="direcao">Tipo de lançamento</Label>
          <NativeSelect id="direcao" name="direcao" defaultValue="PAGAR">
            <option value="PAGAR">Despesa (nós pagamos)</option>
            <option value="RECEBER">Receita (nós recebemos)</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contratante">Contratante</Label>
          <Input id="contratante" name="contratante" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contratado">Contratado</Label>
          <Input id="contratado" name="contratado" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <CurrencyInput id="valor" name="valor" />
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
          <Textarea id="observacoes" name="observacoes" />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? "Salvando..." : "Criar contrato"}
        </Button>
      </div>
    </form>
  );
}
