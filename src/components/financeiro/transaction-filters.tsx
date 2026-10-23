"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { PeriodoFilter } from "@/components/ui/periodo-filter";
import { TRANSACTION_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/status-labels";

const BANK_ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Poupança",
  CAIXA: "Caixa (dinheiro)",
  CARTAO_CREDITO: "Cartão de crédito",
  OUTRA: "Outra",
};

type StageOption = { id: string; codigo: string | null; nome: string };

export function TransactionFilters({
  categorias,
  suppliers = [],
  clients = [],
  works = [],
  stagesByWork = {},
  bankAccounts = [],
}: {
  categorias: { id: string; nome: string }[];
  suppliers?: { id: string; nome: string }[];
  clients?: { id: string; nome: string }[];
  works?: { id: string; nome: string; codigo: string }[];
  stagesByWork?: Record<string, StageOption[]>;
  bankAccounts?: {
    id: string;
    nome: string;
    banco: string | null;
    tipo: string;
    diaFechamento?: number | null;
    diaVencimento?: number | null;
  }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    setParams({ [key]: value });
  }

  function setParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const bankAccountId = searchParams.get("bankAccountId") ?? "";
  const selectedAccount = bankAccounts.find((a) => a.id === bankAccountId);
  const isCartaoComVencimento =
    selectedAccount?.tipo === "CARTAO_CREDITO" && !!selectedAccount.diaVencimento;
  const dataInicioParam = searchParams.get("dataInicio") ?? "";
  const dataFimParam = searchParams.get("dataFim") ?? "";
  const defaultMesFatura =
    isCartaoComVencimento && dataInicioParam && dataInicioParam === dataFimParam
      ? dataInicioParam.slice(0, 7)
      : "";

  function handleMesFaturaChange(value: string) {
    if (!value || !selectedAccount?.diaVencimento) return;
    const [yearStr, monthStr] = value.split("-");
    const dueDate = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, selectedAccount.diaVencimento));
    const dataStr = dueDate.toISOString().slice(0, 10);
    setParams({ periodo: "personalizado", dataInicio: dataStr, dataFim: dataStr });
  }

  const workId = searchParams.get("workId") ?? "";
  const stagesForWork = stagesByWork[workId] ?? [];
  const supplierIds = (searchParams.get("supplierIds") ?? "").split(",").filter(Boolean);
  const clientIds = (searchParams.get("clientIds") ?? "").split(",").filter(Boolean);

  function handleWorkChange(value: string) {
    // Trocar de obra invalida a etapa escolhida — ela pode não existir na nova obra.
    setParams({ workId: value, stageId: undefined });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("tipo") ?? ""}
        onChange={(e) => setParam("tipo", e.target.value)}
      >
        <option value="">Pagar e receber</option>
        <option value="PAGAR">A pagar (despesa)</option>
        <option value="RECEBER">A receber (receita)</option>
      </NativeSelect>
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">Todos os status</option>
        <option value="EM_ABERTO">Em aberto (pendente + vencido)</option>
        {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("categoriaId") ?? ""}
        onChange={(e) => setParam("categoriaId", e.target.value)}
      >
        <option value="">Todas as categorias</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nome}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect className="w-auto" value={workId} onChange={(e) => handleWorkChange(e.target.value)}>
        <option value="">Todos os centros de custo</option>
        {works.map((work) => (
          <option key={work.id} value={work.id}>
            {work.codigo} — {work.nome}
          </option>
        ))}
      </NativeSelect>
      {workId && stagesForWork.length > 0 ? (
        <NativeSelect
          className="w-auto"
          defaultValue={searchParams.get("stageId") ?? ""}
          onChange={(e) => setParam("stageId", e.target.value)}
          key={workId}
        >
          <option value="">Todas as etapas</option>
          {stagesForWork.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.codigo ? `${stage.codigo} — ` : ""}
              {stage.nome}
            </option>
          ))}
        </NativeSelect>
      ) : null}
      <MultiCombobox
        values={supplierIds}
        onChange={(values) => setParam("supplierIds", values.join(","))}
        options={suppliers.map((s) => ({ value: s.id, label: s.nome }))}
        placeholder="Fornecedor..."
        emptyMessage="Nenhum fornecedor encontrado."
        className="w-64"
      />
      <MultiCombobox
        values={clientIds}
        onChange={(values) => setParam("clientIds", values.join(","))}
        options={clients.map((c) => ({ value: c.id, label: c.nome }))}
        placeholder="Cliente..."
        emptyMessage="Nenhum cliente encontrado."
        className="w-64"
      />
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("bankAccountId") ?? ""}
        onChange={(e) => setParam("bankAccountId", e.target.value)}
      >
        <option value="">Todas as contas/cartões</option>
        {bankAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.nome}
            {account.banco ? ` — ${account.banco}` : ""} ({BANK_ACCOUNT_TYPE_LABELS[account.tipo] ?? account.tipo})
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        className="w-auto"
        defaultValue={searchParams.get("formaPagamento") ?? ""}
        onChange={(e) => setParam("formaPagamento", e.target.value)}
      >
        <option value="">Todas as formas de pagamento</option>
        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <PeriodoFilter inicioLabel="Vencimento de" fimLabel="Vencimento até" />
      {isCartaoComVencimento ? (
        <div className="flex items-center gap-2">
          <label htmlFor="mesFatura" className="text-sm text-muted-foreground">
            Mês da fatura
          </label>
          <input
            id="mesFatura"
            type="month"
            key={bankAccountId}
            defaultValue={defaultMesFatura}
            onChange={(e) => handleMesFaturaChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
      ) : null}
    </div>
  );
}
