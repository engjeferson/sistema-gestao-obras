import { notFound } from "next/navigation";
import { getContract, createMeasurement } from "@/server/actions/contratos";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { MeasurementForm } from "@/components/contratos/measurement-form";

export default async function NovaMedicaoPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  const [contract, categorias, bankAccounts] = await Promise.all([
    getContract(contractId),
    listFinancialCategories(),
    listActiveBankAccounts(),
  ]);

  if (!contract || contract.workId !== id) {
    notFound();
  }

  const proximoNumero = (contract.measurements[0]?.numero ?? 0) + 1;
  const bankAccountsOptions = bankAccounts.map((account) => ({ id: account.id, nome: account.nome }));

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Nova medição — {contract.nome}</h2>
        <p className="text-muted-foreground">
          Gera automaticamente uma conta {contract.direcao === "PAGAR" ? "a pagar" : "a receber"} vinculada.
        </p>
      </div>
      <MeasurementForm
        action={createMeasurement}
        workId={id}
        contractId={contractId}
        categorias={categorias}
        bankAccounts={bankAccountsOptions}
        proximoNumero={proximoNumero}
        direcao={contract.direcao}
      />
    </div>
  );
}
