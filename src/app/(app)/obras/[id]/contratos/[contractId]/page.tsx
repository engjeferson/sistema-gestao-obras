import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, FileSignature, Wallet, PiggyBank, Percent } from "lucide-react";
import { getContract } from "@/server/actions/contratos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MeasurementsTable } from "@/components/contratos/measurements-table";
import { ContractAddendumsTable } from "@/components/contratos/contract-addendums-table";
import { AddAddendumDialog } from "@/components/contratos/add-addendum-dialog";
import { CONTRACT_TYPE_LABELS, formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  const contract = await getContract(contractId);
  if (!contract || contract.workId !== id) {
    notFound();
  }

  const valorPago = contract.measurements.reduce((sum, m) => {
    const paid = m.financialTransaction?.status === "PAGO" ? Number(m.financialTransaction.valor) : 0;
    return sum + paid;
  }, 0);
  const valorAditivos = contract.addendums.reduce((sum, a) => sum + Number(a.valor), 0);
  const valorBase = contract.valor !== null ? Number(contract.valor) : null;
  const valorTotal = valorBase !== null ? valorBase + valorAditivos : null;
  const saldo = valorTotal !== null ? valorTotal - valorPago : null;
  const percentual = valorTotal !== null && valorTotal > 0 ? (valorPago / valorTotal) * 100 : 0;

  const measurements = contract.measurements.map((m) => ({
    id: m.id,
    numero: m.numero,
    data: m.data,
    descricao: m.descricao,
    valor: Number(m.valor),
    status: m.financialTransaction?.status ?? null,
    financialTransactionId: m.financialTransaction?.id ?? null,
    dataVencimento: m.financialTransaction?.dataVencimento ?? null,
    arquivoUrl: m.arquivoUrl,
  }));

  const addendums = contract.addendums.map((a) => ({
    id: a.id,
    data: a.data,
    descricao: a.descricao,
    valor: Number(a.valor),
    observacoes: a.observacoes,
    arquivoUrl: a.arquivoUrl,
  }));

  const proximoNumero = (contract.measurements[0]?.numero ?? 0) + 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{contract.nome}</h2>
            <Badge variant="secondary">{CONTRACT_TYPE_LABELS[contract.tipo]}</Badge>
            <Badge variant={contract.direcao === "PAGAR" ? "destructive" : "success"}>
              {contract.direcao === "PAGAR" ? "Despesa" : "Receita"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {contract.contratante} → {contract.contratado} · {formatDateBR(contract.data)}
          </p>
        </div>
        <div className="flex gap-2">
          <AddAddendumDialog contractId={contractId} workId={id} />
          <Button
            size="sm"
            render={<Link href={`/obras/${id}/contratos/${contractId}/medicoes/nova`} />}
            nativeButton={false}
          >
            <Plus /> Nova medição
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={FileSignature}
          label="Valor total"
          value={valorTotal !== null ? formatCurrencyBRL(valorTotal) : "—"}
        />
        <KpiCard
          icon={Wallet}
          label={contract.direcao === "PAGAR" ? "Pago" : "Recebido"}
          value={formatCurrencyBRL(valorPago)}
          tone="success"
        />
        <KpiCard
          icon={PiggyBank}
          label={`Saldo ${contract.direcao === "PAGAR" ? "a pagar" : "a receber"}`}
          value={saldo !== null ? formatCurrencyBRL(saldo) : "—"}
          tone={saldo !== null && saldo < 0 ? "destructive" : "default"}
        />
        <KpiCard icon={Percent} label="Progresso" value={`${percentual.toFixed(2)}%`} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Medições</h3>
        <MeasurementsTable measurements={measurements} workId={id} contractId={contractId} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Aditivos</h3>
        <ContractAddendumsTable addendums={addendums} workId={id} contractId={contractId} />
      </div>
    </div>
  );
}
