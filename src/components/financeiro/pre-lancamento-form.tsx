"use client";

import { useActionState, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { ContractAttachmentsField, type ContractAttachmentValue } from "@/components/contratos/contract-attachments-field";
import { uploadFileToR2 } from "@/lib/upload-file";
import { TRANSACTION_TYPE_LABELS } from "@/lib/status-labels";

type StageOption = { id: string; codigo: string | null; nome: string };

export type PreLancamentoFormDefaultValues = {
  workId?: string;
  stageId?: string;
  tipo?: "PAGAR" | "RECEBER";
  descricao?: string;
  categoriaId?: string;
  favorecidoNome?: string;
  valor?: number;
  dataVencimento?: string;
  observacao?: string;
  attachments?: ContractAttachmentValue[];
};

export function PreLancamentoForm({
  action,
  works,
  categorias,
  stagesByWork,
  favorecidosOptions,
  defaultValues,
  submitLabel,
  origem,
  rawInput,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  works: { id: string; nome: string; codigo: string }[];
  categorias: { id: string; nome: string }[];
  stagesByWork: Record<string, StageOption[]>;
  favorecidosOptions: string[];
  defaultValues?: PreLancamentoFormDefaultValues;
  submitLabel: string;
  origem?: "MANUAL" | "IA";
  rawInput?: string;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [selectedWorkId, setSelectedWorkId] = useState(defaultValues?.workId ?? "");
  const [selectedStageId, setSelectedStageId] = useState(defaultValues?.stageId ?? "");
  const [attachments, setAttachments] = useState<ContractAttachmentValue[]>(defaultValues?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const draftId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const stagesForWork = stagesByWork[selectedWorkId] ?? [];

  async function handleFilesChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: ContractAttachmentValue[] = [];
      for (const file of Array.from(files)) {
        const key = await uploadFileToR2(file, "comprovantes", selectedWorkId || null, `${draftId}-${uploaded.length}`);
        uploaded.push({ url: key, nome: file.name });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      toast.success(uploaded.length > 1 ? "Arquivos enviados." : "Arquivo enviado.");
    } catch {
      toast.error("Não foi possível enviar o(s) arquivo(s). Verifique a configuração de armazenamento.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveAttachment(url: string) {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {origem ? <input type="hidden" name="origem" value={origem} readOnly /> : null}
      {rawInput ? <input type="hidden" name="rawInput" value={rawInput} readOnly /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="workId">Obra (centro de custo)</Label>
          <NativeSelect
            id="workId"
            name="workId"
            value={selectedWorkId}
            onChange={(e) => {
              setSelectedWorkId(e.target.value);
              setSelectedStageId("");
            }}
          >
            <option value="">—</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.codigo} — {work.nome}
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
            disabled={!selectedWorkId}
          >
            <option value="">—</option>
            {stagesForWork.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.codigo ? `${stage.codigo} — ` : ""}
                {stage.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <NativeSelect id="tipo" name="tipo" defaultValue={defaultValues?.tipo ?? "PAGAR"}>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <CurrencyInput id="valor" name="valor" defaultValue={defaultValues?.valor} required />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Input id="descricao" name="descricao" defaultValue={defaultValues?.descricao} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoriaId">Categoria</Label>
          <NativeSelect id="categoriaId" name="categoriaId" defaultValue={defaultValues?.categoriaId ?? ""}>
            <option value="">—</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">Precisa estar preenchida pra poder aprovar.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="favorecidoNome">Fornecedor / Cliente</Label>
          <Input
            id="favorecidoNome"
            name="favorecidoNome"
            defaultValue={defaultValues?.favorecidoNome}
            list="favorecidos-datalist"
          />
          <datalist id="favorecidos-datalist">
            {favorecidosOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataVencimento">Vencimento</Label>
          <Input
            id="dataVencimento"
            name="dataVencimento"
            type="date"
            defaultValue={defaultValues?.dataVencimento}
          />
          <p className="text-xs text-muted-foreground">Precisa estar preenchida pra poder aprovar.</p>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacao">Observação</Label>
          <Textarea id="observacao" name="observacao" defaultValue={defaultValues?.observacao ?? ""} />
        </div>
        <ContractAttachmentsField
          attachments={attachments}
          uploading={uploading}
          onFilesChange={(files) => void handleFilesChange(files)}
          onRemove={handleRemoveAttachment}
          label="Anexos (opcional)"
        />
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
