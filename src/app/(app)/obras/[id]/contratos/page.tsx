import Link from "next/link";
import { Plus } from "lucide-react";
import { listContracts } from "@/server/actions/contratos";
import { getCurrentSensitiveValuesAccess, getCurrentModulePermissions } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { ContractsTable } from "@/components/contratos/contracts-table";

export default async function ContratosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contractsRaw, canSeeValues, modulePermissions] = await Promise.all([
    listContracts(id),
    getCurrentSensitiveValuesAccess(),
    getCurrentModulePermissions(),
  ]);
  const canEdit = !modulePermissions.contratosSomenteLeitura;
  const contracts = contractsRaw.map((contract) => ({
    id: contract.id,
    nome: contract.nome,
    tipo: contract.tipo,
    direcao: contract.direcao,
    contratante: contract.contratante,
    contratado: contract.contratado,
    valor: contract.valor !== null ? Number(contract.valor) : null,
    valorPago: contract.valorPago,
    saldo: contract.saldo,
    percentual: contract.percentual,
    data: contract.data,
    arquivoUrl: contract.arquivoUrl,
  }));

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex items-center justify-end">
          <Button size="sm" render={<Link href={`/obras/${id}/contratos/novo`} />} nativeButton={false}>
            <Plus /> Novo contrato
          </Button>
        </div>
      ) : null}
      <ContractsTable contracts={contracts} workId={id} canSeeValues={canSeeValues} canEdit={canEdit} />
    </div>
  );
}
