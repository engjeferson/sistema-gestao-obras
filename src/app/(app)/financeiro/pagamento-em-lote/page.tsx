import { auth } from "@/lib/auth";
import { listOpenTransactionsForBatchPayment } from "@/server/actions/financeiro";
import { listSuppliers } from "@/server/actions/fornecedores";
import { getCurrentFinancePermissions } from "@/server/actions/permissions";
import { FinanceiroTabsNav } from "@/components/financeiro/financeiro-tabs-nav";
import { BatchPaymentView } from "@/components/financeiro/batch-payment-view";

export default async function PagamentoEmLotePage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>;
}) {
  const { supplierId } = await searchParams;
  const [session, perms, suppliers] = await Promise.all([auth(), getCurrentFinancePermissions(), listSuppliers()]);
  const canEdit = session?.user.role === "ADMINISTRADOR" || session?.user.role === "FINANCEIRO";

  if (!perms.verSaidas) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Selecione um fornecedor e marque as contas que deseja pagar.</p>
        </div>
        <FinanceiroTabsNav />
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Você não tem permissão para ver contas a pagar.
        </p>
      </div>
    );
  }

  const transactions = supplierId
    ? await listOpenTransactionsForBatchPayment({
        tipo: "PAGAR",
        supplierId,
        categoriaIdIn: perms.categoriasPermitidasIds ?? undefined,
      })
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Selecione um fornecedor e marque as contas que deseja pagar.</p>
      </div>

      <FinanceiroTabsNav />

      <BatchPaymentView
        suppliers={suppliers}
        supplierId={supplierId ?? ""}
        transactions={transactions}
        canEdit={canEdit}
      />
    </div>
  );
}
