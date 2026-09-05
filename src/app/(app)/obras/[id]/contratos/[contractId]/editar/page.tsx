import { notFound } from "next/navigation";
import { ContractForm } from "@/components/contratos/contract-form";
import { getContract, updateContract } from "@/server/actions/contratos";
import { getCompanySettings } from "@/server/actions/empresa";
import { getWork } from "@/server/actions/obras";
import { listSuppliers } from "@/server/actions/fornecedores";

export default async function EditarContratoPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  const [contract, companySettings, work, suppliers] = await Promise.all([
    getContract(contractId),
    getCompanySettings(),
    getWork(id),
    listSuppliers(),
  ]);

  if (!contract || contract.workId !== id) {
    notFound();
  }

  const updateContractWithId = updateContract.bind(null, contract.id);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar contrato</h1>
      </div>
      <ContractForm
        action={updateContractWithId}
        workId={id}
        companyName={companySettings.nome}
        workClient={work?.client ? { id: work.client.id, nome: work.client.nome } : null}
        supplierNames={suppliers.map((s) => s.nome)}
        submitLabel="Salvar alterações"
        defaultValues={{
          nome: contract.nome,
          tipo: contract.tipo,
          direcao: contract.direcao,
          contratado: contract.contratado,
          valor: contract.valor !== null ? Number(contract.valor) : null,
          data: contract.data,
          observacoes: contract.observacoes,
          arquivoUrl: contract.arquivoUrl,
        }}
      />
    </div>
  );
}
