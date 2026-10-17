"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleSupplierActive, deleteSupplier } from "@/server/actions/fornecedores";
import { SUPPLIER_CATEGORY_LABELS } from "@/lib/status-labels";

type SupplierRow = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  categoria: string | null;
  ativo: boolean;
  usado: boolean;
};

function ToggleButton({ supplier }: { supplier: SupplierRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleSupplierActive(supplier.id, !supplier.ativo);
          router.refresh();
        })
      }
    >
      {supplier.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

function DeleteButton({ supplier }: { supplier: SupplierRow }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSupplier(supplier.id);
        toast.success("Fornecedor excluído.");
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
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir "${supplier.nome}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        isPending={isPending}
        destructive
      />
    </>
  );
}

export function SuppliersTable({ suppliers }: { suppliers: SupplierRow[] }) {
  if (suppliers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum fornecedor cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">
                <Link href={`/cadastros/fornecedores/${supplier.id}`} className="hover:underline">
                  {supplier.nome}
                </Link>
              </TableCell>
              <TableCell>{supplier.categoria ? SUPPLIER_CATEGORY_LABELS[supplier.categoria] : "—"}</TableCell>
              <TableCell>{supplier.documento ?? "—"}</TableCell>
              <TableCell>{supplier.telefone ?? "—"}</TableCell>
              <TableCell>{supplier.email ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={supplier.ativo ? "success" : "secondary"}>
                  {supplier.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" render={<Link href={`/cadastros/fornecedores/${supplier.id}/editar`} />} nativeButton={false}>
                    Editar
                  </Button>
                  <ToggleButton supplier={supplier} />
                  {!supplier.usado ? <DeleteButton supplier={supplier} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
