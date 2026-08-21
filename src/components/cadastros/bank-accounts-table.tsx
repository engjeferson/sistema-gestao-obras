"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleBankAccountActive } from "@/server/actions/contas-bancarias";

const TIPO_LABELS: Record<string, string> = {
  CORRENTE: "Conta corrente",
  POUPANCA: "Poupança",
  CAIXA: "Caixa (dinheiro)",
  CARTAO_CREDITO: "Cartão de crédito",
  OUTRA: "Outra",
};

type BankAccountRow = {
  id: string;
  nome: string;
  banco: string | null;
  tipo: string;
  ativo: boolean;
};

function ToggleButton({ bankAccount }: { bankAccount: BankAccountRow }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleBankAccountActive(bankAccount.id, !bankAccount.ativo);
          router.refresh();
        })
      }
    >
      {bankAccount.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

export function BankAccountsTable({ bankAccounts }: { bankAccounts: BankAccountRow[] }) {
  if (bankAccounts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma conta bancária cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Banco</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bankAccounts.map((bankAccount) => (
            <TableRow key={bankAccount.id}>
              <TableCell className="font-medium">
                <Link href={`/cadastros/contas-bancarias/${bankAccount.id}/editar`} className="hover:underline">
                  {bankAccount.nome}
                </Link>
              </TableCell>
              <TableCell>{bankAccount.banco ?? "—"}</TableCell>
              <TableCell>{TIPO_LABELS[bankAccount.tipo]}</TableCell>
              <TableCell>
                <Badge variant={bankAccount.ativo ? "success" : "secondary"}>
                  {bankAccount.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ToggleButton bankAccount={bankAccount} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
