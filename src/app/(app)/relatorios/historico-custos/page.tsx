import { notFound } from "next/navigation";
import { listCostHistory } from "@/server/actions/relatorios";
import { getCurrentReportPermissions } from "@/server/actions/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UNIT_LABELS, formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";

export default async function HistoricoCustosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const permissions = await getCurrentReportPermissions();
  if (!permissions.verRelatoriosOperacionais) {
    notFound();
  }

  const { search } = await searchParams;
  const items = await listCostHistory(search);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico de custos</h1>
        <p className="text-muted-foreground">
          Compare o preço de materiais e serviços entre compras, fornecedores e obras.
        </p>
      </div>

      <form className="flex max-w-sm gap-2">
        <Input name="search" placeholder="Buscar material ou serviço" defaultValue={search ?? ""} />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Itens de notas fiscais ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Valor unit.</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.material}</TableCell>
                      <TableCell>{item.fornecedorNome}</TableCell>
                      <TableCell>{formatDateBR(item.dataEmissao)}</TableCell>
                      <TableCell>{item.workNome}</TableCell>
                      <TableCell>{item.stageNome ?? "—"}</TableCell>
                      <TableCell>
                        {item.quantidade} {UNIT_LABELS[item.unidade] ?? item.unidade}
                      </TableCell>
                      <TableCell>{formatCurrencyBRL(item.valorUnitario)}</TableCell>
                      <TableCell>{formatCurrencyBRL(item.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
