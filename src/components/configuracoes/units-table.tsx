"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditableName } from "@/components/ui/editable-name";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleUnitActive, updateUnit } from "@/server/actions/unidades";

type UnitRow = { id: string; sigla: string; nome: string | null; ativo: boolean };

function ToggleButton({ unit }: { unit: UnitRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleUnitActive(unit.id, !unit.ativo);
          router.refresh();
        })
      }
    >
      {unit.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

export function UnitsTable({ units }: { units: UnitRow[] }) {
  const router = useRouter();

  function handleUpdate(unit: UnitRow, patch: { sigla?: string; nome?: string }) {
    updateUnit(unit.id, patch.sigla ?? unit.sigla, patch.nome ?? unit.nome ?? "")
      .then(() => router.refresh())
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar."));
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sigla</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => (
            <TableRow key={unit.id}>
              <TableCell className="font-medium">
                <EditableName value={unit.sigla} className="text-sm" onCommit={(sigla) => handleUpdate(unit, { sigla })} />
              </TableCell>
              <TableCell>
                <EditableName
                  value={unit.nome ?? ""}
                  className="text-sm"
                  placeholder="—"
                  onCommit={(nome) => handleUpdate(unit, { nome })}
                />
              </TableCell>
              <TableCell>
                <Badge variant={unit.ativo ? "success" : "destructive"}>{unit.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <ToggleButton unit={unit} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
