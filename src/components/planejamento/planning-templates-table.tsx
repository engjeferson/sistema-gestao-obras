"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateBR } from "@/lib/status-labels";
import { deletePlanningTemplate } from "@/server/actions/planejamento-templates";

export type PlanningTemplateRow = {
  id: string;
  nome: string;
  descricao: string | null;
  createdByName: string;
  createdAt: Date;
  stageCount: number;
  taskCount: number;
};

function DeleteButton({ templateId }: { templateId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Excluir este template? Isso não afeta obras que já usaram ele.")) return;
        startTransition(async () => {
          await deletePlanningTemplate(templateId);
          router.refresh();
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function PlanningTemplatesTable({ templates }: { templates: PlanningTemplateRow[] }) {
  if (templates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum template cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Etapas</TableHead>
            <TableHead>Atividades</TableHead>
            <TableHead>Criado por</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.nome}</TableCell>
              <TableCell className="text-muted-foreground">{t.descricao ?? "—"}</TableCell>
              <TableCell>{t.stageCount}</TableCell>
              <TableCell>{t.taskCount}</TableCell>
              <TableCell>{t.createdByName}</TableCell>
              <TableCell>{formatDateBR(t.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" render={<Link href={`/planejamento-templates/${t.id}/editar`} />} nativeButton={false} title="Editar">
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton templateId={t.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
