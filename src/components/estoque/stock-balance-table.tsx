import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyBRL } from "@/lib/status-labels";

export type BalanceRow = {
  materialId: string;
  materialNome: string;
  unidade: string | null;
  saldo: number;
  valorTotal: number;
};

export function StockBalanceTable({ balances }: { balances: BalanceRow[] }) {
  if (balances.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma movimentação neste local ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {balances.map((row) => (
            <TableRow key={row.materialId}>
              <TableCell className="font-medium">
                <Link
                  href={`/estoque/material/${row.materialId}`}
                  className="hover:text-primary hover:underline"
                >
                  {row.materialNome}
                </Link>
              </TableCell>
              <TableCell>{row.unidade ?? "—"}</TableCell>
              <TableCell className={row.saldo < 0 ? "text-destructive" : ""}>{row.saldo}</TableCell>
              <TableCell>{formatCurrencyBRL(row.valorTotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
