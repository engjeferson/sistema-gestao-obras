import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { listTransactions, listFinancialCategories } from "@/server/actions/financeiro";
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/financeiro/transactions-table";
import { TransactionFilters } from "@/components/financeiro/transaction-filters";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { TransactionStatus, TransactionType } from "@/generated/prisma/enums";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    tipo?: string;
    categoriaId?: string;
    favorecido?: string;
    dataPagamentoInicio?: string;
    dataPagamentoFim?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const [session, result, categorias] = await Promise.all([
    auth(),
    listTransactions(
      {
        status: params.status as TransactionStatus | undefined,
        tipo: params.tipo as TransactionType | undefined,
        categoriaId: params.categoriaId || undefined,
        favorecido: params.favorecido || undefined,
        dataPagamentoInicio: params.dataPagamentoInicio || undefined,
        dataPagamentoFim: params.dataPagamentoFim || undefined,
      },
      page,
    ),
    listFinancialCategories(),
  ]);
  const canEdit = session?.user.role === "ADMINISTRADOR" || session?.user.role === "FINANCEIRO";

  return (
    <div className="flex flex-col gap-4">
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

      <TransactionFilters categorias={categorias} />

      <TransactionsTable transactions={result.items} canEdit={canEdit} />
      <PaginationControls page={result.page} totalPages={result.totalPages} />
    </div>
  );
}
