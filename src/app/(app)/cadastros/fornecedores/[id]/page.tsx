import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ShoppingCart, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { getSupplierDetail } from "@/server/actions/fornecedores";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  SUPPLIER_CATEGORY_LABELS,
  TRANSACTION_STATUS_BADGE,
  TRANSACTION_STATUS_LABELS,
  formatCurrencyBRL,
  formatDateBR,
} from "@/lib/status-labels";

export default async function FornecedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getSupplierDetail(id);
  if (!detail) {
    notFound();
  }

  const { supplier, totalComprado, totalPago, totalAPagar, ultimasCompras, historicoFinanceiro, obrasAtendidas } =
    detail;

  const cards = [
    { icon: ShoppingCart, label: "Total comprado", value: formatCurrencyBRL(totalComprado) },
    { icon: ArrowUpCircle, label: "Total pago", value: formatCurrencyBRL(totalPago), tone: "success" as const },
    { icon: ArrowDownCircle, label: "Total a pagar", value: formatCurrencyBRL(totalAPagar), tone: "destructive" as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{supplier.nome}</h1>
            <Badge variant={supplier.ativo ? "success" : "secondary"}>{supplier.ativo ? "Ativo" : "Inativo"}</Badge>
          </div>
          <p className="text-muted-foreground">
            {supplier.nomeFantasia ? `${supplier.nomeFantasia} · ` : ""}
            {supplier.categoria ? SUPPLIER_CATEGORY_LABELS[supplier.categoria] : "Sem categoria"}
            {supplier.documento ? ` · ${supplier.documento}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/cadastros/fornecedores/${supplier.id}/editar`} />}
          nativeButton={false}
        >
          <Pencil /> Editar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Telefone: {supplier.telefone ?? "—"}</p>
          <p>WhatsApp: {supplier.whatsapp ?? "—"}</p>
          <p>E-mail: {supplier.email ?? "—"}</p>
          <p>Endereço: {supplier.endereco ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Obras atendidas</CardTitle>
        </CardHeader>
        <CardContent>
          {obrasAtendidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma obra atendida ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {obrasAtendidas.map((work) => (
                <li key={work.id}>
                  <Link href={`/obras/${work.id}`} className="text-sm hover:underline">
                    {work.codigo} — {work.nome}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas compras (notas fiscais)</CardTitle>
        </CardHeader>
        <CardContent>
          {ultimasCompras.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma nota fiscal registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NF</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimasCompras.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.numero}</TableCell>
                      <TableCell>{formatDateBR(invoice.dataEmissao)}</TableCell>
                      <TableCell>{invoice.workNome}</TableCell>
                      <TableCell>{formatCurrencyBRL(invoice.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          {historicoFinanceiro.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento financeiro ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoFinanceiro.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.descricao}</TableCell>
                      <TableCell>{t.workNome}</TableCell>
                      <TableCell>{t.categoriaNome}</TableCell>
                      <TableCell>{formatDateBR(t.dataVencimento)}</TableCell>
                      <TableCell>{formatCurrencyBRL(t.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={TRANSACTION_STATUS_BADGE[t.status]}>
                          {TRANSACTION_STATUS_LABELS[t.status]}
                        </Badge>
                      </TableCell>
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
