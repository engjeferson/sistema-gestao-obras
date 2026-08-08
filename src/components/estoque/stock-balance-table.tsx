import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UNIT_LABELS } from "@/lib/status-labels";

type BalanceRow = {
  materialId: string;
  materialNome: string;
  unidade: string | null;
  saldo: number;
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {balances.map((row) => (
            <TableRow key={row.materialId}>
              <TableCell className="font-medium">{row.materialNome}</TableCell>
              <TableCell>{row.unidade ? UNIT_LABELS[row.unidade] : "—"}</TableCell>
              <TableCell className={row.saldo < 0 ? "text-destructive" : ""}>{row.saldo}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
