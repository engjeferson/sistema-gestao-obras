"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, FileText, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteContract, reorderContracts } from "@/server/actions/contratos";
import { CONTRACT_TYPE_LABELS, formatCurrencyOrHidden, formatDateBR } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

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

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteContract(contractId, workId);
        toast.success("Contrato excluído.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      } finally {
        setConfirming(false);
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="icon" disabled={isPending} onClick={() => setConfirming(true)} title="Excluir">
        <Trash2 className="size-4" />
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir contrato"
        description="Tem certeza que deseja excluir este contrato? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleConfirm}
        isPending={isPending}
        destructive
      />
    </>
  );
}

export function ContractsTable({
  contracts,
  workId,
  canSeeValues,
  canEdit = true,
}: {
  contracts: ContractRow[];
  workId: string;
  canSeeValues: boolean;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState<string[] | null>(null);
  const draggingIdRef = useRef(draggingId);
  const displayOrderRef = useRef(displayOrder);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    draggingIdRef.current = draggingId;
    displayOrderRef.current = displayOrder;
  }, [draggingId, displayOrder]);

  useEffect(() => {
    if (!draggingId) return;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    function onMove(e: PointerEvent) {
      const id = draggingIdRef.current;
      if (!id) return;
      for (const [otherId, el] of cardRefs.current) {
        if (otherId === id) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
        setDisplayOrder((prev) => {
          if (!prev) return prev;
          const next = prev.filter((x) => x !== id);
          next.splice(next.indexOf(otherId), 0, id);
          return next;
        });
        break;
      }
    }

    function onUp() {
      const finalOrder = displayOrderRef.current;
      setDraggingId(null);
      setDisplayOrder(null);
      if (!finalOrder) return;
      const originalOrder = contracts.map((c) => c.id);
      if (JSON.stringify(finalOrder) === JSON.stringify(originalOrder)) return;
      reorderContracts(workId, finalOrder).then(() => router.refresh());
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [draggingId, contracts, workId, router]);

  function startDrag(id: string) {
    setDisplayOrder(contracts.map((c) => c.id));
    setDraggingId(id);
  }

  const contractById = useMemo(() => new Map(contracts.map((c) => [c.id, c])), [contracts]);
  const orderedContracts = displayOrder
    ? displayOrder.map((id) => contractById.get(id)).filter((c): c is ContractRow => !!c)
    : contracts;

  if (contracts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum contrato cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orderedContracts.map((contract) => (
        <Card
          key={contract.id}
          ref={(el) => {
            if (el) cardRefs.current.set(contract.id, el);
            else cardRefs.current.delete(contract.id);
          }}
          className={cn(draggingId === contract.id && "opacity-60")}
        >
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <span
                    onPointerDown={(e) => {
                      e.preventDefault();
                      startDrag(contract.id);
                    }}
                    title="Arrastar para reordenar"
                    className="flex touch-none cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </span>
                ) : null}
                <Link
                  href={`/obras/${workId}/contratos/${contract.id}`}
                  className="flex items-center gap-1 font-medium hover:underline"
                >
                  {contract.nome}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </div>
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
                {canEdit ? <DeleteContractButton contractId={contract.id} workId={workId} /> : null}
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
                    {contract.direcao === "PAGAR" ? "Pago" : "Recebido"}:{" "}
                    {formatCurrencyOrHidden(contract.valorPago, canSeeValues)}
                  </span>
                  <span>{contract.percentual.toFixed(2)}%</span>
                  <span>Total: {formatCurrencyOrHidden(contract.valor, canSeeValues)}</span>
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
                  Saldo {contract.direcao === "PAGAR" ? "a pagar" : "a receber"}:{" "}
                  {formatCurrencyOrHidden(contract.saldo, canSeeValues)}
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
