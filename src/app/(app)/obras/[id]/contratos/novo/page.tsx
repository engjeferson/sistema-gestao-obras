import { ContractForm } from "@/components/contratos/contract-form";
import { createContract } from "@/server/actions/contratos";
import { getCompanySettings } from "@/server/actions/empresa";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";

export default async function NovoContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [companySettings, suppliers, clients] = await Promise.all([
    getCompanySettings(),
    listSuppliers(),
    listClients(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo contrato</h1>
      </div>
      <ContractForm
        action={createContract}
        workId={id}
        companyName={companySettings.nome}
        supplierNames={suppliers.map((s) => s.nome)}
        clients={clients.map((c) => ({ id: c.id, nome: c.nome }))}
      />
    </div>
  );
}
