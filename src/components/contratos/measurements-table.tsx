"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Paperclip, CheckCircle2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteMeasurement } from "@/server/actions/contratos";
import { markAsPago } from "@/server/actions/financeiro";
import { TRANSACTION_STATUS_BADGE, TRANSACTION_STATUS_LABELS, formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

type MeasurementRow = {
  id: string;
  numero: number;
  data: Date;
  descricao: string | null;
  valor: number;
  status: string | null;
  financialTransactionId: string | null;
  dataVencimento: Date | null;
  arquivoUrl: string | null;
};

function FinalizeButton({ transactionId, workId }: { transactionId: string; workId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await markAsPago(transactionId, workId);
        toast.success("Pagamento finalizado.");
        router.refresh();
      } catch {
        toast.error("Não foi possível finalizar o pagamento.");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" title="Finalizar pagamento" disabled={isPending} onClick={handleClick}>
      <CheckCircle2 className="size-4" />
    </Button>
  );
}

function DeleteButton({ measurementId, workId, contractId }: { measurementId: string; workId: string; contractId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteMeasurement(measurementId, workId, contractId);
        toast.success("Medição excluída.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      } finally {
        setConfirming(false);
      }
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

export function MeasurementsTable({
  measurements,
  workId,
  contractId,
}: {
  measurements: MeasurementRow[];
  workId: string;
  contractId: string;
}) {
  if (measurements.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma medição lançada ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medição</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Comprovante</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {measurements.map((measurement) => (
            <TableRow key={measurement.id}>
              <TableCell className="font-medium">#{measurement.numero}</TableCell>
              <TableCell>{formatDateBR(measurement.data)}</TableCell>
              <TableCell>{measurement.descricao ?? "—"}</TableCell>
              <TableCell>{measurement.dataVencimento ? formatDateBR(measurement.dataVencimento) : "—"}</TableCell>
              <TableCell>{formatCurrencyBRL(measurement.valor)}</TableCell>
              <TableCell>
                {measurement.status ? (
                  <Badge
                    variant={TRANSACTION_STATUS_BADGE[measurement.status]}
                    className={measurement.status === "VENCIDO" ? "animate-pulse-subtle" : undefined}
                  >
                    {TRANSACTION_STATUS_LABELS[measurement.status]}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {measurement.arquivoUrl ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Ver comprovante"
                    render={<a href={`/api/files?key=${encodeURIComponent(measurement.arquivoUrl)}`} target="_blank" rel="noopener noreferrer" />}
                    nativeButton={false}
                  >
                    <Paperclip className="size-4" />
                  </Button>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  {measurement.status && measurement.status !== "PAGO" && measurement.financialTransactionId ? (
                    <FinalizeButton transactionId={measurement.financialTransactionId} workId={workId} />
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    render={
                      <Link href={`/obras/${workId}/contratos/${contractId}/medicoes/${measurement.id}/editar`} />
                    }
                    nativeButton={false}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton measurementId={measurement.id} workId={workId} contractId={contractId} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
