"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditableName } from "@/components/ui/editable-name";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleFinancialCategoryActive, updateFinancialCategory } from "@/server/actions/financeiro";

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
  const router = useRouter();

  function handleRename(category: CategoryRow, nome: string) {
    updateFinancialCategory(category.id, nome)
      .then(() => router.refresh())
      .catch((error) => toast.error(error instanceof Error ? error.message : "Não foi possível renomear."));
  }

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
              <TableCell className="font-medium">
                <EditableName
                  value={category.nome}
                  className="text-sm"
                  onCommit={(nome) => handleRename(category, nome)}
                />
              </TableCell>
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
