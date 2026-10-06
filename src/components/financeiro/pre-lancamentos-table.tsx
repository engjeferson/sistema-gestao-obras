"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, RotateCcw, Trash2, Paperclip, Pencil, Sparkles, User, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approvePreLancamento, rejectPreLancamento, reopenPreLancamento, deletePreLancamento } from "@/server/actions/pre-lancamentos";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";
import type { PreLancamentoStatus } from "@/generated/prisma/enums";

export type PreLancamentoRow = {
  id: string;
  createdAt: Date;
  dataVencimento: Date | null;
  descricao: string;
  tipo: "PAGAR" | "RECEBER";
  valor: number;
  favorecidoNome: string | null;
  origem: "MANUAL" | "IA";
  motivoRecusa: string | null;
  work: { nome: string; codigo: string } | null;
  categoria: { nome: string } | null;
  attachments: { url: string; nome: string }[];
  qtdItens: number;
};

function ApproveButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await approvePreLancamento(id);
        toast.success("Pré-lançamento aprovado — lançamento criado no Financeiro.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível aprovar.");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" title="Aprovar" disabled={isPending} onClick={handleClick}>
      <Check className="size-4" />
    </Button>
  );
}

function RejectButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await rejectPreLancamento(id);
        toast.success("Pré-lançamento recusado.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível recusar.");
      } finally {
        setConfirming(false);
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="icon" title="Recusar" disabled={isPending} onClick={() => setConfirming(true)}>
        <X className="size-4" />
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Recusar pré-lançamento"
        description="Tem certeza que deseja recusar este pré-lançamento? Ele fica guardado na aba Recusados e pode ser reaberto depois."
        confirmLabel="Recusar"
        onConfirm={handleConfirm}
        isPending={isPending}
        destructive
      />
    </>
  );
}

function ReopenButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await reopenPreLancamento(id);
        toast.success("Pré-lançamento reaberto.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível reabrir.");
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" title="Reabrir" disabled={isPending} onClick={handleClick}>
      <RotateCcw className="size-4" />
    </Button>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deletePreLancamento(id);
        toast.success("Pré-lançamento excluído.");
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
      <Button variant="ghost" size="icon" title="Excluir" disabled={isPending} onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" />
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir pré-lançamento"
        description="Tem certeza que deseja excluir este pré-lançamento? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleConfirm}
        isPending={isPending}
        destructive
      />
    </>
  );
}

export function PreLancamentosTable({ items, status }: { items: PreLancamentoRow[]; status: PreLancamentoStatus }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum pré-lançamento {status === "PENDENTE" ? "pendente" : status === "RECUSADO" ? "recusado" : "finalizado"}.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Criação</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Centro de custo</TableHead>
            <TableHead>Fornecedor/Cliente</TableHead>
            <TableHead>Valor (R$)</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Anexos</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{formatDateBR(item.createdAt)}</TableCell>
              <TableCell>{item.dataVencimento ? formatDateBR(item.dataVencimento) : "—"}</TableCell>
              <TableCell className="max-w-56 truncate" title={item.descricao}>
                <span className="flex items-center gap-1.5">
                  {item.qtdItens > 0 ? (
                    <Receipt className="size-3.5 shrink-0 text-muted-foreground" aria-label="Pedido/NF" />
                  ) : null}
                  {item.descricao}
                </span>
                {item.qtdItens > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {item.qtdItens} {item.qtdItens === 1 ? "item" : "itens"}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{item.work ? `${item.work.codigo} — ${item.work.nome}` : "—"}</TableCell>
              <TableCell>{item.favorecidoNome || "—"}</TableCell>
              <TableCell className={item.tipo === "PAGAR" ? "text-destructive" : "text-success"}>
                {item.tipo === "PAGAR" ? "-" : ""}
                {formatCurrencyBRL(item.valor)}
              </TableCell>
              <TableCell>
                <Badge variant={item.origem === "IA" ? "success" : "secondary"} className="gap-1">
                  {item.origem === "IA" ? <Sparkles className="size-3" /> : <User className="size-3" />}
                  {item.origem === "IA" ? "IA" : "Manual"}
                </Badge>
              </TableCell>
              <TableCell>
                {item.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.attachments.map((att) => (
                      <Button
                        key={att.url}
                        variant="ghost"
                        size="icon"
                        title={att.nome}
                        render={<a href={`/api/files?key=${encodeURIComponent(att.url)}`} target="_blank" rel="noopener noreferrer" />}
                        nativeButton={false}
                      >
                        <Paperclip className="size-4" />
                      </Button>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  {status === "PENDENTE" ? (
                    <>
                      <ApproveButton id={item.id} />
                      <RejectButton id={item.id} />
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        render={<Link href={`/financeiro/pre-lancamentos/${item.id}/editar`} />}
                        nativeButton={false}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton id={item.id} />
                    </>
                  ) : null}
                  {status === "RECUSADO" ? (
                    <>
                      <ReopenButton id={item.id} />
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        render={<Link href={`/financeiro/pre-lancamentos/${item.id}/editar`} />}
                        nativeButton={false}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton id={item.id} />
                    </>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
