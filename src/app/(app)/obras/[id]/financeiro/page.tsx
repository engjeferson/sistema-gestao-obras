import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, FileSignature, ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";
import { auth } from "@/lib/auth";
import { getWorkFinancialSummary, listTransactions } from "@/server/actions/financeiro";
import { getCurrentFinancePermissions } from "@/server/actions/permissions";
import { restrictTransactionFilters } from "@/lib/finance-permissions";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TransactionsTable } from "@/components/financeiro/transactions-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { formatCurrencyBRL } from "@/lib/status-labels";
import type { TransactionType } from "@/generated/prisma/enums";

export default async function ObraFinanceiroPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const [session, summary, perms] = await Promise.all([
    auth(),
    getWorkFinancialSummary(id),
    getCurrentFinancePermissions(),
  ]);

  if (!summary) {
    notFound();
  }
  const canEdit = session?.user.role === "ADMINISTRADOR" || session?.user.role === "FINANCEIRO";
  const hasAccess = perms.verEntradas || perms.verSaidas;
  const baseFilters: { workId: string; tipo?: TransactionType; categoriaId?: string } = { workId: id };
  const filters = restrictTransactionFilters(baseFilters, perms);
  const result = hasAccess
    ? await listTransactions(filters, page)
    : { items: [], totalCount: 0, totalPages: 1, page: 1 };

  const cards: { icon: typeof FileSignature; label: string; value: string; tone?: "success" | "destructive"; href?: string }[] = [
    { icon: FileSignature, label: "Contrato", value: formatCurrencyBRL(summary.contrato) },
    ...(perms.verSaidas
      ? [
          {
            icon: ArrowDownCircle,
            label: "Gasto até agora",
            value: formatCurrencyBRL(summary.gasto),
            tone: "destructive" as const,
            href: `/financeiro?workId=${id}&tipo=PAGAR`,
          },
        ]
      : []),
    ...(perms.verEntradas
      ? [
          {
            icon: ArrowUpCircle,
            label: "Recebido",
            value: formatCurrencyBRL(summary.recebido),
            tone: "success" as const,
            href: `/financeiro?workId=${id}&tipo=RECEBER&status=PAGO`,
          },
        ]
      : []),
    ...(perms.verSaldo
      ? [
          {
            icon: PiggyBank,
            label: "Saldo",
            value: formatCurrencyBRL(summary.saldo),
            tone: (summary.saldo < 0 ? "destructive" : "success") as "destructive" | "success",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {canEdit ? (
        <div className="flex items-center justify-end">
          <Button size="sm" render={<Link href={`/financeiro/nova?workId=${id}`} />} nativeButton={false}>
            <Plus /> Novo lançamento
          </Button>
        </div>
      ) : null}

      {hasAccess ? (
        <>
          <TransactionsTable transactions={result.items} showObraColumn={false} canEdit={canEdit} />
          <PaginationControls page={result.page} totalPages={result.totalPages} />
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Você não tem permissão para ver lançamentos financeiros.
        </p>
      )}
    </div>
  );
}
