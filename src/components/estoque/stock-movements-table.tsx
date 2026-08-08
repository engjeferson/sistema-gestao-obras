import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

const TIPO_LABELS: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  TRANSFERENCIA: "Transferência",
};

const TIPO_BADGE: Record<string, "success" | "destructive" | "secondary"> = {
  ENTRADA: "success",
  SAIDA: "destructive",
  TRANSFERENCIA: "secondary",
};

type MovementRow = {
  id: string;
  tipo: string;
  quantidade: number;
  valorUnitario: number | null;
  data: Date;
  motivo: string | null;
  material: { nome: string };
  origemWork: { nome: string; codigo: string } | null;
  destinoWork: { nome: string; codigo: string } | null;
  createdBy: { name: string };
};

function localLabel(work: { nome: string; codigo: string } | null) {
  return work ? `${work.codigo} — ${work.nome}` : "Estoque Geral";
}

export function StockMovementsTable({ movements }: { movements: MovementRow[] }) {
  if (movements.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma movimentação registrada ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Lançado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{formatDateBR(m.data)}</TableCell>
              <TableCell>
                <Badge variant={TIPO_BADGE[m.tipo]}>{TIPO_LABELS[m.tipo]}</Badge>
              </TableCell>
              <TableCell className="font-medium">{m.material.nome}</TableCell>
              <TableCell>{m.tipo === "ENTRADA" ? "—" : localLabel(m.origemWork)}</TableCell>
              <TableCell>{m.tipo === "SAIDA" ? "—" : localLabel(m.destinoWork)}</TableCell>
              <TableCell>{m.quantidade}</TableCell>
              <TableCell>
                {m.valorUnitario !== null ? formatCurrencyBRL(m.valorUnitario * m.quantidade) : "—"}
              </TableCell>
              <TableCell>{m.motivo ?? "—"}</TableCell>
              <TableCell>{m.createdBy.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
