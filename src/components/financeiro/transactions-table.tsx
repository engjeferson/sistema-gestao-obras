import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransactionRowActions } from "@/components/financeiro/transaction-row-actions";
import {
  TRANSACTION_STATUS_BADGE,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatCurrencyBRL,
  formatDateBR,
} from "@/lib/status-labels";

type TransactionRow = {
  id: string;
  workId: string | null;
  tipo: string;
  descricao: string;
  favorecidoNome: string;
  valor: unknown;
  dataVencimento: Date;
  effectiveStatus: string;
  categoria: { nome: string };
  work: { nome: string; codigo: string } | null;
};

export function TransactionsTable({
  transactions,
  showObraColumn = true,
  canEdit = true,
}: {
  transactions: TransactionRow[];
  showObraColumn?: boolean;
  canEdit?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhum lançamento encontrado.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            {showObraColumn ? <TableHead>Obra</TableHead> : null}
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Favorecido</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                {canEdit ? (
                  <Link href={`/financeiro/${t.id}/editar`} className="font-medium hover:underline">
                    {t.descricao}
                  </Link>
                ) : (
                  <span className="font-medium">{t.descricao}</span>
                )}
              </TableCell>
              {showObraColumn ? (
                <TableCell>
                  {t.work ? (
                    <Link href={`/obras/${t.workId}`} className="hover:underline">
                      {t.work.codigo}
                    </Link>
                  ) : (
                    "Despesa geral"
                  )}
                </TableCell>
              ) : null}
              <TableCell>{TRANSACTION_TYPE_LABELS[t.tipo]}</TableCell>
              <TableCell>{t.categoria.nome}</TableCell>
              <TableCell>{t.favorecidoNome}</TableCell>
              <TableCell>{formatDateBR(t.dataVencimento)}</TableCell>
              <TableCell>{formatCurrencyBRL(Number(t.valor))}</TableCell>
              <TableCell>
                <Badge
                  variant={TRANSACTION_STATUS_BADGE[t.effectiveStatus]}
                  className={t.effectiveStatus === "VENCIDO" ? "animate-pulse-subtle" : undefined}
                >
                  {TRANSACTION_STATUS_LABELS[t.effectiveStatus]}
                </Badge>
              </TableCell>
              <TableCell>
                {canEdit ? (
                  <TransactionRowActions transactionId={t.id} workId={t.workId} status={t.effectiveStatus} />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
