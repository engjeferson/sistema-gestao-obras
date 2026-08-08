import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyBRL } from "@/lib/status-labels";

type WorkRow = {
  id: string;
  nome: string;
  codigo: string;
  avancoFisico: number;
  contrato: number;
  orcado: number;
  realizado: number;
  aPagar: number;
  margemProjetada: number;
};

export function WorksOverviewTable({ works }: { works: WorkRow[] }) {
  return (
    <Card>
      <CardContent className="px-0 pt-0">
        {works.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">Nenhuma obra cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Avanço</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Orçado</TableHead>
                  <TableHead>Realizado</TableHead>
                  <TableHead>A pagar</TableHead>
                  <TableHead>Margem projetada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {works.map((work) => (
                  <TableRow key={work.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/obras/${work.id}`} className="hover:text-primary hover:underline">
                        {work.codigo} — {work.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(Math.max(work.avancoFisico, 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{work.avancoFisico.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrencyBRL(work.contrato)}</TableCell>
                    <TableCell>{formatCurrencyBRL(work.orcado)}</TableCell>
                    <TableCell>{formatCurrencyBRL(work.realizado)}</TableCell>
                    <TableCell>{formatCurrencyBRL(work.aPagar)}</TableCell>
                    <TableCell className={work.margemProjetada < 0 ? "font-medium text-destructive" : "font-medium text-success"}>
                      {work.margemProjetada.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
