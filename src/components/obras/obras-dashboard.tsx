"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  LayoutGrid,
  List,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SearchBox } from "@/components/ui/search-box";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { ObraCard } from "@/components/obras/obra-card";
import { ObrasTable } from "@/components/obras/obras-table";
import { normalizeSearch } from "@/lib/text";
import { formatCurrencyBRL } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import type { ObraDashboardRow } from "@/server/actions/obras";
import type { WorkStatus } from "@/generated/prisma/enums";
import type { FinancePermissions } from "@/lib/finance-permissions";

const ACTIVE_STATUSES: WorkStatus[] = ["PLANEJAMENTO", "EM_ANDAMENTO"];

type StatusTab = "todas" | "ativas" | "inativas";

export function ObrasDashboard({
  works,
  totalCount,
  kpis,
  clients,
  financePermissions,
}: {
  works: ObraDashboardRow[];
  totalCount: number;
  kpis: {
    despesasDoDia: number;
    receitasDoDia: number;
    despesasEmAberto: number;
    receitasEmAberto: number;
    saudeFinanceiraGlobal: number;
    hojeDateStr: string;
  };
  clients: { id: string; nome: string }[];
  financePermissions: FinancePermissions;
}) {
  const [statusTab, setStatusTab] = useState<StatusTab>("ativas");
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [view, setView] = useState<"lista" | "grade">("grade");

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    return works.filter((obra) => {
      if (statusTab === "ativas" && !ACTIVE_STATUSES.includes(obra.status)) return false;
      if (statusTab === "inativas" && ACTIVE_STATUSES.includes(obra.status)) return false;
      if (clientId && obra.client?.id !== clientId) return false;
      if (q && ![obra.nome, obra.codigo].some((field) => normalizeSearch(field).includes(q))) return false;
      return true;
    });
  }, [works, statusTab, search, clientId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Building2} label="Obras" value={`${filtered.length}/${totalCount}`} />
        {financePermissions.verSaidas ? (
          <KpiCard
            icon={Wallet}
            label="Despesas do dia"
            value={formatCurrencyBRL(kpis.despesasDoDia)}
            tone="destructive"
            href={`/financeiro?tipo=PAGAR&status=PAGO&dataPagamentoInicio=${kpis.hojeDateStr}&dataPagamentoFim=${kpis.hojeDateStr}`}
          />
        ) : null}
        {financePermissions.verEntradas ? (
          <KpiCard
            icon={PiggyBank}
            label="Receitas do dia"
            value={formatCurrencyBRL(kpis.receitasDoDia)}
            tone="success"
            href={`/financeiro?tipo=RECEBER&status=PAGO&dataPagamentoInicio=${kpis.hojeDateStr}&dataPagamentoFim=${kpis.hojeDateStr}`}
          />
        ) : null}
        {financePermissions.verSaidas ? (
          <KpiCard
            icon={ArrowDownCircle}
            label="Despesas em aberto"
            value={formatCurrencyBRL(kpis.despesasEmAberto)}
            tone="destructive"
            href="/financeiro?tipo=PAGAR&status=PENDENTE"
          />
        ) : null}
        {financePermissions.verEntradas ? (
          <KpiCard
            icon={ArrowUpCircle}
            label="Receitas em aberto"
            value={formatCurrencyBRL(kpis.receitasEmAberto)}
            tone="success"
            href="/financeiro?tipo=RECEBER&status=PENDENTE"
          />
        ) : null}
        {financePermissions.verSaudeFinanceira ? (
          <KpiCard
            icon={kpis.saudeFinanceiraGlobal >= 0 ? TrendingUp : TrendingDown}
            label="Saúde financeira"
            value={formatCurrencyBRL(kpis.saudeFinanceiraGlobal)}
            tone={kpis.saudeFinanceiraGlobal >= 0 ? "success" : "destructive"}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit rounded-full bg-muted p-1">
          {(
            [
              ["todas", "Todas"],
              ["ativas", "Ativas"],
              ["inativas", "Inativas"],
            ] as [StatusTab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusTab(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                statusTab === value
                  ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setView("lista")}
            aria-label="Lista"
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors",
              view === "lista"
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-4" /> Lista
          </button>
          <button
            type="button"
            onClick={() => setView("grade")}
            aria-label="Grade"
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors",
              view === "grade"
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-4" /> Grade
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome ou código..."
            resultCount={filtered.length}
            totalCount={works.length}
          />
        </div>
        <NativeSelect
          className="w-auto min-w-[10rem]"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.nome}
            </option>
          ))}
        </NativeSelect>
      </div>

      {works.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma obra cadastrada ainda.{" "}
          <Link href="/obras/novo" className="text-primary hover:underline">
            Cadastre a primeira
          </Link>
          .
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma obra encontrada com esses filtros.
        </p>
      ) : view === "grade" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((obra) => (
            <ObraCard key={obra.id} obra={obra} />
          ))}
        </div>
      ) : (
        <ObrasTable works={filtered} />
      )}
    </div>
  );
}
