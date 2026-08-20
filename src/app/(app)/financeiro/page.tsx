import Link from "next/link";
import { Plus, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { listTransactions, listFinancialCategories, getTransactionsSummary } from "@/server/actions/financeiro";
import { getWork } from "@/server/actions/obras";
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/financeiro/transactions-table";
import { TransactionFilters } from "@/components/financeiro/transaction-filters";
import { FinanceiroTabsNav } from "@/components/financeiro/financeiro-tabs-nav";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { formatCurrencyBRL } from "@/lib/status-labels";
import type { TransactionStatus, TransactionType } from "@/generated/prisma/enums";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    workId?: string;
    status?: string;
    tipo?: string;
    categoriaId?: string;
    favorecido?: string;
    dataInicio?: string;
    dataFim?: string;
    dataPagamentoInicio?: string;
    dataPagamentoFim?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const filters = {
    workId: params.workId || undefined,
    status: params.status as TransactionStatus | "EM_ABERTO" | undefined,
    tipo: params.tipo as TransactionType | undefined,
    categoriaId: params.categoriaId || undefined,
    favorecido: params.favorecido || undefined,
    dataInicio: params.dataInicio || undefined,
    dataFim: params.dataFim || undefined,
    dataPagamentoInicio: params.dataPagamentoInicio || undefined,
    dataPagamentoFim: params.dataPagamentoFim || undefined,
  };
  const [session, result, categorias, summary, work] = await Promise.all([
    auth(),
    listTransactions(filters, page),
    listFinancialCategories(),
    getTransactionsSummary(filters),
    filters.workId ? getWork(filters.workId) : Promise.resolve(null),
  ]);
  const canEdit = session?.user.role === "ADMINISTRADOR" || session?.user.role === "FINANCEIRO";

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex flex-col gap-4 border-b bg-background p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">Contas a pagar, pagas e receitas de todas as obras.</p>
          </div>
          {canEdit ? (
            <Button render={<Link href="/financeiro/nova" />} nativeButton={false}>
              <Plus /> Novo lançamento
            </Button>
          ) : null}
        </div>

        <FinanceiroTabsNav />

        <TransactionFilters categorias={categorias} />

        {work ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Filtrando pela obra:</span>
            <span className="font-medium">
              {work.codigo} — {work.nome}
            </span>
            <Link
              href={{ pathname: "/financeiro", query: { ...params, workId: undefined, page: undefined } }}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> remover
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <TransactionsTable transactions={result.items} canEdit={canEdit} />

        <PaginationControls page={result.page} totalPages={result.totalPages} />
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-6 border-t bg-background p-4 md:p-6">
        <div>
          <p className="text-xs text-muted-foreground">Total a pagar</p>
          <p className="text-lg font-heading font-semibold">{formatCurrencyBRL(summary.totalAPagar)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total pagas</p>
          <p className="text-lg font-heading font-semibold text-success">{formatCurrencyBRL(summary.totalPagas)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total pendentes</p>
          <p className="text-lg font-heading font-semibold text-warning">
            {formatCurrencyBRL(summary.totalPendentes)}
          </p>
        </div>
      </div>
    </div>
  );
}
