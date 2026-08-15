"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleProfessionalTypeActive } from "@/server/actions/tipos-profissional";

type ProfessionalTypeRow = { id: string; nome: string; ativo: boolean };

function ToggleButton({ type }: { type: ProfessionalTypeRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleProfessionalTypeActive(type.id, !type.ativo);
          router.refresh();
        })
      }
    >
      {type.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

export function ProfessionalTypesTable({ types }: { types: ProfessionalTypeRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => (
            <TableRow key={type.id}>
              <TableCell className="font-medium">{type.nome}</TableCell>
              <TableCell>
                <Badge variant={type.ativo ? "success" : "secondary"}>{type.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <ToggleButton type={type} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
