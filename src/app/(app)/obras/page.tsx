import Link from "next/link";
import { Plus } from "lucide-react";
import { listWorks } from "@/server/actions/obras";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WORK_STATUS_BADGE, WORK_STATUS_LABELS, formatCurrencyBRL } from "@/lib/status-labels";

export default async function ObrasPage() {
  const works = await listWorks();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Obras</h1>
          <p className="text-muted-foreground">{works.length} obra(s) cadastrada(s).</p>
        </div>
        <Button render={<Link href="/obras/novo" />} nativeButton={false}>
          <Plus /> Nova obra
        </Button>
      </div>

      {works.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma obra cadastrada ainda.
        </p>
      ) : (
        <Card>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor do contrato</TableHead>
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
                    <TableCell>{formatCurrencyBRL(Number(work.valorContrato))}</TableCell>
                    <TableCell>
                      <Badge variant={WORK_STATUS_BADGE[work.status]}>
                        {WORK_STATUS_LABELS[work.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
