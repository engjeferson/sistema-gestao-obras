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
import { toggleMaterialActive, deleteMaterial } from "@/server/actions/materiais";
import { formatCurrencyOrHidden } from "@/lib/status-labels";

type MaterialRow = {
  id: string;
  nome: string;
  unidadePadrao: string | null;
  precoUnitario: number | null;
  categoria: string | null;
  ativo: boolean;
  usado: boolean;
};

function ToggleButton({ material }: { material: MaterialRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleMaterialActive(material.id, !material.ativo);
          router.refresh();
        })
      }
    >
      {material.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

function DeleteButton({ material }: { material: MaterialRow }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteMaterial(material.id);
        toast.success("Material excluído.");
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
        title="Excluir material"
        description={`Tem certeza que deseja excluir "${material.nome}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        isPending={isPending}
        destructive
      />
    </>
  );
}

export function MaterialsTable({ materials, canSeeValues }: { materials: MaterialRow[]; canSeeValues: boolean }) {
  if (materials.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum material cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Unidade padrão</TableHead>
            <TableHead>Preço unitário</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">
                <Link href={`/cadastros/materiais/${material.id}/editar`} className="hover:underline">
                  {material.nome}
                </Link>
              </TableCell>
              <TableCell>{material.unidadePadrao ?? "—"}</TableCell>
              <TableCell>
                {material.precoUnitario !== null ? formatCurrencyOrHidden(material.precoUnitario, canSeeValues) : "—"}
              </TableCell>
              <TableCell>{material.categoria ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={material.ativo ? "success" : "destructive"}>
                  {material.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <ToggleButton material={material} />
                  {!material.usado ? <DeleteButton material={material} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
