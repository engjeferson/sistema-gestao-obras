import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WORK_STATUS_BADGE, WORK_STATUS_LABELS, formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";
import type { ObraDashboardRow } from "@/server/actions/obras";

export function ObrasTable({ works }: { works: ObraDashboardRow[] }) {
  return (
    <Card>
      <CardContent className="px-0 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Responsável técnico</TableHead>
              <TableHead>Encarregado</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Custo total</TableHead>
              <TableHead>Previsão de entrega</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {works.map((work) => (
              <TableRow key={work.id}>
                <TableCell>
                  <Link href={`/obras/${work.id}`} className="font-medium hover:text-primary hover:underline">
                    {work.codigo}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/obras/${work.id}`} className="hover:text-primary hover:underline">
                    {work.nome}
                  </Link>
                </TableCell>
                <TableCell>{work.client?.nome ?? "—"}</TableCell>
                <TableCell>{work.responsavelTecnico?.name ?? "—"}</TableCell>
                <TableCell>{work.encarregado?.name ?? "—"}</TableCell>
                <TableCell>{work.percentualExecutado.toFixed(2)}%</TableCell>
                <TableCell>{formatCurrencyBRL(work.custoTotal)}</TableCell>
                <TableCell>{formatDateBR(work.dataPrevistaTermino)}</TableCell>
                <TableCell>
                  <Badge variant={WORK_STATUS_BADGE[work.status]}>{WORK_STATUS_LABELS[work.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
