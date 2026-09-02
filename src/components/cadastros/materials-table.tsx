"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleMaterialActive } from "@/server/actions/materiais";
import { formatCurrencyOrHidden } from "@/lib/status-labels";

const UNIT_LABELS: Record<string, string> = {
  UN: "un",
  KG: "kg",
  M: "m",
  M2: "m²",
  M3: "m³",
  SACO: "saco",
  CAIXA: "caixa",
  LITRO: "litro",
};

type MaterialRow = {
  id: string;
  nome: string;
  unidadePadrao: string | null;
  precoUnitario: number | null;
  categoria: string | null;
  ativo: boolean;
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
              <TableCell>{material.unidadePadrao ? UNIT_LABELS[material.unidadePadrao] : "—"}</TableCell>
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
                <ToggleButton material={material} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
