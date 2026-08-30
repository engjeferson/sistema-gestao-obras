import { notFound } from "next/navigation";
import { ContractForm } from "@/components/contratos/contract-form";
import { getContract, updateContract } from "@/server/actions/contratos";
import { getCompanySettings } from "@/server/actions/empresa";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";

export default async function EditarContratoPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  const [contract, companySettings, suppliers, clients] = await Promise.all([
    getContract(contractId),
    getCompanySettings(),
    listSuppliers(),
    listClients(),
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
        supplierNames={suppliers.map((s) => s.nome)}
        clients={clients.map((c) => ({ id: c.id, nome: c.nome }))}
        submitLabel="Salvar alterações"
        defaultValues={{
          nome: contract.nome,
          tipo: contract.tipo,
          direcao: contract.direcao,
          contratanteClientId: contract.contratanteClientId,
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
