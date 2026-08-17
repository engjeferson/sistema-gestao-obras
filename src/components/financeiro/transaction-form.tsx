"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS, formatCurrencyBRL } from "@/lib/status-labels";
import type { FinancialTransactionModel } from "@/generated/prisma/models";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  BOLETO: "Boleto",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
  CHEQUE: "Cheque",
  OUTROS: "Outros",
};

type TransactionFormDefaultValues = Partial<Omit<FinancialTransactionModel, "valor">> & {
  valor?: number;
};

type StageOption = { id: string; codigo: string | null; nome: string; tasks: { id: string; codigo: string | null; nome: string }[] };

type TransactionFormProps = {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  works: { id: string; nome: string; codigo: string }[];
  categorias: { id: string; nome: string }[];
  bankAccounts: { id: string; nome: string }[];
  stagesByWork: Record<string, StageOption[]>;
  favorecidosOptions: string[];
  defaultValues?: TransactionFormDefaultValues;
  defaultWorkId?: string;
  submitLabel: string;
  allowParcelamento?: boolean;
};

function toDateInputValue(date: Date | string | undefined | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function TransactionForm({
  action,
  works,
  categorias,
  bankAccounts,
  stagesByWork,
  favorecidosOptions,
  defaultValues,
  defaultWorkId,
  submitLabel,
  allowParcelamento = false,
}: TransactionFormProps) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [parcelar, setParcelar] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(2);
  const [valor, setValor] = useState<number>(defaultValues?.valor ?? 0);
  const [selectedWorkId, setSelectedWorkId] = useState(defaultValues?.workId ?? defaultWorkId ?? "");
  const [selectedStageId, setSelectedStageId] = useState(defaultValues?.stageId ?? "");

  const valorParcela = numeroParcelas > 0 ? valor / numeroParcelas : 0;
  const stagesForWork = stagesByWork[selectedWorkId] ?? [];
  const tasksForStage = stagesForWork.find((s) => s.id === selectedStageId)?.tasks ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="workId">Obra</Label>
          <NativeSelect
            id="workId"
            name="workId"
            value={selectedWorkId}
            onChange={(e) => {
              setSelectedWorkId(e.target.value);
              setSelectedStageId("");
            }}
            required
          >
            <option value="" disabled>
              Selecione a obra
            </option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.codigo} — {work.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stageId">Etapa</Label>
          <NativeSelect
            id="stageId"
            name="stageId"
            value={selectedStageId}
            onChange={(e) => setSelectedStageId(e.target.value)}
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
          <Label htmlFor="taskId">Atividade</Label>
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
          <Label htmlFor="tipo">Tipo</Label>
          <NativeSelect id="tipo" name="tipo" defaultValue={defaultValues?.tipo ?? "PAGAR"}>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Input id="descricao" name="descricao" defaultValue={defaultValues?.descricao} required />
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
          <Label htmlFor="favorecidoNome">Fornecedor / Cliente</Label>
          <Input
            id="favorecidoNome"
            name="favorecidoNome"
            defaultValue={defaultValues?.favorecidoNome}
            list="favorecidos-datalist"
            required
          />
          <datalist id="favorecidos-datalist">
            {favorecidosOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$){parcelar ? " total" : ""}</Label>
          <CurrencyInput id="valor" name="valor" value={valor} onValueChange={setValor} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={defaultValues?.status ?? "PENDENTE"}>
            {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataEmissao">Data de emissão</Label>
          <Input
            id="dataEmissao"
            name="dataEmissao"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataEmissao)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataVencimento">
            {parcelar ? "Vencimento da 1ª parcela" : "Data de vencimento"}
          </Label>
          <Input
            id="dataVencimento"
            name="dataVencimento"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataVencimento)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataPagamento">Data de pagamento</Label>
          <Input
            id="dataPagamento"
            name="dataPagamento"
            type="date"
            defaultValue={toDateInputValue(defaultValues?.dataPagamento)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="formaPagamento">Forma de pagamento</Label>
          <NativeSelect id="formaPagamento" name="formaPagamento" defaultValue={defaultValues?.formaPagamento ?? ""}>
            <option value="">—</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacao">Observação</Label>
          <Textarea id="observacao" name="observacao" defaultValue={defaultValues?.observacao ?? ""} />
        </div>
      </div>

      {allowParcelamento ? (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="parcelar"
              checked={parcelar}
              onChange={(e) => setParcelar(e.target.checked)}
              className="size-4"
            />
            Parcelar este lançamento
          </label>
          {parcelar ? (
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="numeroParcelas">Número de parcelas mensais</Label>
              <Input
                id="numeroParcelas"
                name="numeroParcelas"
                type="number"
                min="2"
                max="60"
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(Number(e.target.value))}
              />
              {valor > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {numeroParcelas}x de {formatCurrencyBRL(valorParcela)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
