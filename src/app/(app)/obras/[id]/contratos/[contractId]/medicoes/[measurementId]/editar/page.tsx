import { notFound } from "next/navigation";
import { getMeasurement, updateMeasurement } from "@/server/actions/contratos";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { MeasurementForm } from "@/components/contratos/measurement-form";

export default async function EditarMedicaoPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string; measurementId: string }>;
}) {
  const { id, contractId, measurementId } = await params;
  const [measurement, categorias, bankAccounts] = await Promise.all([
    getMeasurement(measurementId),
    listFinancialCategories(),
    listActiveBankAccounts(),
  ]);

  if (!measurement || measurement.contract.workId !== id || measurement.contractId !== contractId) {
    notFound();
  }

  const bankAccountsOptions = bankAccounts.map((account) => ({ id: account.id, nome: account.nome }));
  const updateMeasurementWithId = updateMeasurement.bind(null, measurement.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Editar medição #{measurement.numero} — {measurement.contract.nome}</h2>
      </div>
      <MeasurementForm
        action={updateMeasurementWithId}
        workId={id}
        contractId={contractId}
        categorias={categorias}
        bankAccounts={bankAccountsOptions}
        proximoNumero={measurement.numero}
        direcao={measurement.contract.direcao}
        submitLabel="Salvar alterações"
        defaultValues={{
          data: measurement.data,
          dataVencimento: measurement.financialTransaction?.dataVencimento ?? undefined,
          valor: Number(measurement.valor),
          categoriaId: measurement.financialTransaction?.categoriaId,
          bankAccountId: measurement.financialTransaction?.bankAccountId,
          descricao: measurement.descricao,
          observacoes: measurement.observacoes,
          arquivoUrl: measurement.arquivoUrl,
        }}
      />
    </div>
  );
}
