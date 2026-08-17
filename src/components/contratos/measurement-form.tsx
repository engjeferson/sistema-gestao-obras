"use client";

import { useActionState, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { uploadFileToR2 } from "@/lib/upload-file";
import { PAYMENT_METHOD_LABELS } from "@/lib/status-labels";

export function MeasurementForm({
  action,
  workId,
  contractId,
  categorias,
  bankAccounts,
  proximoNumero,
  direcao,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  workId: string;
  contractId: string;
  categorias: { id: string; nome: string }[];
  bankAccounts: { id: string; nome: string }[];
  proximoNumero: number;
  direcao: "PAGAR" | "RECEBER";
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [confirmar, setConfirmar] = useState(false);
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const draftId = useId().replace(/[^a-zA-Z0-9]/g, "");

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const key = await uploadFileToR2(file, "medicoes", workId, draftId);
      setArquivoUrl(key);
      toast.success("Comprovante enviado.");
    } catch {
      toast.error("Não foi possível enviar o arquivo. Verifique a configuração de armazenamento.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="arquivoUrl" value={arquivoUrl ?? ""} readOnly />

      <p className="text-sm text-muted-foreground">Medição #{proximoNumero}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data da medição</Label>
          <Input id="data" name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataVencimento">Data de vencimento</Label>
          <Input id="dataVencimento" name="dataVencimento" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <CurrencyInput id="valor" name="valor" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoriaId">Categoria</Label>
          <NativeSelect id="categoriaId" name="categoriaId" defaultValue="" required>
            <option value="" disabled>
              Selecione a categoria
            </option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bankAccountId">Conta bancária</Label>
          <NativeSelect id="bankAccountId" name="bankAccountId" defaultValue="">
            <option value="">—</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Input id="descricao" name="descricao" placeholder="Ex: Etapa 2 concluída" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="comprovante">Comprovante (opcional)</Label>
          <Input
            id="comprovante"
            type="file"
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

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="confirmar"
            checked={confirmar}
            onChange={(e) => setConfirmar(e.target.checked)}
            className="size-4"
          />
          {direcao === "PAGAR" ? "Confirmar pagamento agora" : "Confirmar recebimento agora"}
        </label>
        {confirmar ? (
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="formaPagamento">Forma de pagamento</Label>
            <NativeSelect id="formaPagamento" name="formaPagamento" defaultValue="">
              <option value="">—</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? "Salvando..." : "Lançar medição"}
        </Button>
      </div>
    </form>
  );
}
