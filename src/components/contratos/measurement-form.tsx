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

type MeasurementFormDefaultValues = {
  data?: Date | string;
  dataVencimento?: Date | string;
  valor?: number;
  categoriaId?: string;
  bankAccountId?: string | null;
  stageId?: string | null;
  taskId?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  arquivoUrl?: string | null;
};

type StageOption = { id: string; codigo: string | null; nome: string; tasks: { id: string; codigo: string | null; nome: string }[] };

function toDateInputValue(date: Date | string | undefined | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function MeasurementForm({
  action,
  workId,
  contractId,
  categorias,
  bankAccounts,
  stages,
  proximoNumero,
  direcao,
  defaultValues,
  submitLabel = "Lançar medição",
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  workId: string;
  contractId: string;
  categorias: { id: string; nome: string }[];
  bankAccounts: { id: string; nome: string }[];
  stages: StageOption[];
  proximoNumero: number;
  direcao: "PAGAR" | "RECEBER";
  defaultValues?: MeasurementFormDefaultValues;
  submitLabel?: string;
}) {
  const isEdit = Boolean(defaultValues);
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [confirmar, setConfirmar] = useState(false);
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(defaultValues?.arquivoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState(defaultValues?.stageId ?? "");
  const draftId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const tasksForStage = stages.find((s) => s.id === selectedStageId)?.tasks ?? [];

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

      {!isEdit ? <p className="text-sm text-muted-foreground">Medição #{proximoNumero}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data da medição</Label>
          <Input
            id="data"
            name="data"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.data) || new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataVencimento">Data de vencimento</Label>
          <Input
            id="dataVencimento"
            name="dataVencimento"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataVencimento)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <CurrencyInput id="valor" name="valor" defaultValue={defaultValues?.valor} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoriaId">Categoria</Label>
          <NativeSelect id="categoriaId" name="categoriaId" defaultValue={defaultValues?.categoriaId ?? ""} required>
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
          <Label htmlFor="stageId">Etapa (opcional)</Label>
          <NativeSelect
            id="stageId"
            name="stageId"
            value={selectedStageId}
            onChange={(e) => setSelectedStageId(e.target.value)}
          >
            <option value="">—</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.codigo ? `${stage.codigo} — ` : ""}
                {stage.nome}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">Vincula esse custo a uma etapa do planejamento, pra comparar previsto x realizado depois.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="taskId">Atividade (opcional)</Label>
          <NativeSelect
            id="taskId"
            name="taskId"
            key={selectedStageId}
            defaultValue={selectedStageId === defaultValues?.stageId ? (defaultValues?.taskId ?? "") : ""}
            disabled={!selectedStageId}
          >
            <option value="">—</option>
            {tasksForStage.map((task) => (
              <option key={task.id} value={task.id}>
                {task.codigo ? `${task.codigo} — ` : ""}
                {task.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bankAccountId">Conta bancária</Label>
          <NativeSelect id="bankAccountId" name="bankAccountId" defaultValue={defaultValues?.bankAccountId ?? ""}>
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
          <Input
            id="descricao"
            name="descricao"
            placeholder="Ex: Etapa 2 concluída"
            defaultValue={defaultValues?.descricao ?? ""}
          />
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
          <Textarea id="observacoes" name="observacoes" defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>

      {!isEdit ? (
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
      ) : null}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
