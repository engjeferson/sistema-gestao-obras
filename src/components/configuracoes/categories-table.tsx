"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleFinancialCategoryActive } from "@/server/actions/financeiro";

type CategoryRow = { id: string; nome: string; ativo: boolean };

function ToggleButton({ category }: { category: CategoryRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleFinancialCategoryActive(category.id, !category.ativo);
          router.refresh();
        })
      }
    >
      {category.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

export function CategoriesTable({ categories }: { categories: CategoryRow[] }) {
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
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.nome}</TableCell>
              <TableCell>
                <Badge variant={category.ativo ? "success" : "secondary"}>
                  {category.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ToggleButton category={category} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
