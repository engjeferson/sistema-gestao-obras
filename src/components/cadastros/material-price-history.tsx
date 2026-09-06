import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

type PriceHistoryItem = {
  id: string;
  quantidade: number;
  valorUnitario: number;
  numeroNF: string;
  fornecedorNome: string;
  dataEmissao: Date;
};

export function MaterialPriceHistory({ items }: { items: PriceHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhuma compra lançada ainda para este material.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>NF</TableHead>
            <TableHead>Qtd.</TableHead>
            <TableHead>Preço unitário</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{formatDateBR(item.dataEmissao)}</TableCell>
              <TableCell className="font-medium">
                <span title={item.fornecedorNome} className="block max-w-[200px] truncate">
                  {item.fornecedorNome}
                </span>
              </TableCell>
              <TableCell>{item.numeroNF || "—"}</TableCell>
              <TableCell>{item.quantidade}</TableCell>
              <TableCell>{formatCurrencyBRL(item.valorUnitario)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
