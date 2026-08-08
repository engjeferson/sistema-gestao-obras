"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleUserActive } from "@/server/actions/usuarios";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  ENGENHEIRO: "Engenheiro",
  FINANCEIRO: "Financeiro",
  OBRA: "Obra (campo)",
};

type UserRow = { id: string; name: string; email: string; role: string; active: boolean };

function ToggleActiveButton({ user }: { user: UserRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await toggleUserActive(user.id, !user.active);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
          }
        })
      }
    >
      {user.active ? "Desativar" : "Ativar"}
    </Button>
  );
}

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{ROLE_LABELS[user.role]}</TableCell>
              <TableCell>
                <Badge variant={user.active ? "success" : "secondary"}>
                  {user.active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ToggleActiveButton user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
