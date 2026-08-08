"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleProfessionalActive } from "@/server/actions/profissionais";

type ProfessionalRow = {
  id: string;
  nome: string;
  funcao: string;
  telefone: string | null;
  documento: string | null;
  ativo: boolean;
};

function ToggleButton({ professional }: { professional: ProfessionalRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleProfessionalActive(professional.id, !professional.ativo);
          router.refresh();
        })
      }
    >
      {professional.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

export function ProfessionalsTable({ professionals }: { professionals: ProfessionalRow[] }) {
  if (professionals.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum profissional cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {professionals.map((professional) => (
            <TableRow key={professional.id}>
              <TableCell className="font-medium">
                <Link href={`/cadastros/profissionais/${professional.id}/editar`} className="hover:underline">
                  {professional.nome}
                </Link>
              </TableCell>
              <TableCell>{professional.funcao}</TableCell>
              <TableCell>{professional.telefone ?? "—"}</TableCell>
              <TableCell>{professional.documento ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={professional.ativo ? "success" : "secondary"}>
                  {professional.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ToggleButton professional={professional} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
