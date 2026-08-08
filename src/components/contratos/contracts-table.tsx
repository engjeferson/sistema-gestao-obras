"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { deleteContract } from "@/server/actions/contratos";
import { CONTRACT_TYPE_LABELS, formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

type ContractRow = {
  id: string;
  nome: string;
  tipo: string;
  direcao: string;
  contratante: string;
  contratado: string;
  valor: number | null;
  valorPago: number;
  saldo: number | null;
  percentual: number;
  data: Date;
  arquivoUrl: string | null;
};

function DeleteContractButton({ contractId, workId }: { contractId: string; workId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await deleteContract(contractId, workId);
      toast.success("Contrato excluído.");
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={handleClick}
      className={confirming ? "text-destructive" : ""}
      title={confirming ? "Confirmar exclusão" : "Excluir"}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function ContractsTable({ contracts, workId }: { contracts: ContractRow[]; workId: string }) {
  if (contracts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum contrato cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <Link
                href={`/obras/${workId}/contratos/${contract.id}`}
                className="flex items-center gap-1 font-medium hover:underline"
              >
                {contract.nome}
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <div className="flex items-center gap-1">
                {contract.arquivoUrl ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Ver arquivo do contrato"
                    render={<a href={`/api/files?key=${encodeURIComponent(contract.arquivoUrl)}`} target="_blank" rel="noopener noreferrer" />}
                    nativeButton={false}
                  >
                    <FileText className="size-4" />
                  </Button>
                ) : null}
                <DeleteContractButton contractId={contract.id} workId={workId} />
              </div>
            </div>

            {contract.valor !== null ? (
              <div className="flex flex-col gap-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-success"
                    style={{ width: `${Math.min(contract.percentual, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {contract.direcao === "PAGAR" ? "Pago" : "Recebido"}: {formatCurrencyBRL(contract.valorPago)}
                  </span>
                  <span>{contract.percentual.toFixed(2)}%</span>
                  <span>Total: {formatCurrencyBRL(contract.valor)}</span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <Badge variant="secondary">{CONTRACT_TYPE_LABELS[contract.tipo]}</Badge>
              <Badge variant={contract.direcao === "PAGAR" ? "destructive" : "success"}>
                {contract.direcao === "PAGAR" ? "Despesa" : "Receita"}
              </Badge>
              <span className="text-muted-foreground">Início: {formatDateBR(contract.data)}</span>
              {contract.saldo !== null ? (
                <span className="text-muted-foreground">
                  Saldo {contract.direcao === "PAGAR" ? "a pagar" : "a receber"}: {formatCurrencyBRL(contract.saldo)}
                </span>
              ) : null}
              <span className="text-muted-foreground">
                {contract.direcao === "PAGAR" ? "Fornecedor" : "Cliente"}:{" "}
                {contract.direcao === "PAGAR" ? contract.contratado : contract.contratante}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
