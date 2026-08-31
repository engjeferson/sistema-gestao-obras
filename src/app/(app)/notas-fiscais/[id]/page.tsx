import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileText, Paperclip, Receipt, Wallet, PiggyBank, Milestone } from "lucide-react";
import { getInvoice } from "@/server/actions/notas-fiscais";
import { getCurrentSensitiveValuesAccess } from "@/server/actions/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  formatCurrencyOrHidden,
  formatDateBR,
  UNIT_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_BADGE,
  PAYMENT_METHOD_LABELS,
} from "@/lib/status-labels";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, canSeeValues] = await Promise.all([getInvoice(id), getCurrentSensitiveValuesAccess()]);
  if (!invoice) {
    notFound();
  }

  const valorTotal = Number(invoice.valorTotal);
  const valorPago = invoice.financialTransactions
    .filter((t) => t.status === "PAGO")
    .reduce((sum, t) => sum + Number(t.valor), 0);
  const saldo = valorTotal - valorPago;

  const etapaVinculada = invoice.stage
    ? { codigo: invoice.stage.codigo, nome: invoice.stage.nome }
    : invoice.task
      ? { codigo: invoice.task.codigo, nome: invoice.task.nome }
      : null;

  const etapaCard = (
    <KpiCard
      icon={Milestone}
      label="Etapa / item vinculado"
      value={etapaVinculada ? `${etapaVinculada.codigo ?? "—"} — ${etapaVinculada.nome}` : "—"}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {invoice.nome ? invoice.nome : invoice.numero ? `Nota Fiscal Nº ${invoice.numero}` : "Nota Fiscal"}
            </h1>
            <Badge variant="secondary">{invoice.work ? invoice.work.codigo : "Estoque Geral"}</Badge>
          </div>
          <p className="text-muted-foreground">
            {invoice.nome && invoice.numero ? `NF Nº ${invoice.numero} · ` : ""}
            {invoice.supplier.nome} · {invoice.categoria.nome} · {formatDateBR(invoice.dataEmissao)}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.incomingNFe ? (
            <Button
              variant="outline"
              size="sm"
              render={<a href={`/api/notas-fiscais/radar/${invoice.incomingNFe.id}/pdf`} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              <FileText /> Ver DANFE
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            render={<Link href={invoice.workId ? `/obras/${invoice.workId}/materiais` : "/estoque"} />}
            nativeButton={false}
          >
            <ExternalLink /> {invoice.workId ? "Ver na obra" : "Ver estoque"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Receipt} label="Valor total" value={formatCurrencyOrHidden(valorTotal, canSeeValues)} />
        <KpiCard icon={Wallet} label="Pago" value={formatCurrencyOrHidden(valorPago, canSeeValues)} tone="success" />
        <KpiCard
          icon={PiggyBank}
          label="Saldo"
          value={formatCurrencyOrHidden(saldo, canSeeValues)}
          tone={saldo > 0 ? "warning" : "default"}
        />
        {etapaVinculada && invoice.workId ? (
          <Link href={`/obras/${invoice.workId}/planejamento`}>{etapaCard}</Link>
        ) : (
          etapaCard
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Itens lançados</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead>Valor unit.</TableHead>
                <TableHead>Valor total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.material}</TableCell>
                  <TableCell>{Number(item.quantidade)}</TableCell>
                  <TableCell>{UNIT_LABELS[item.unidade] ?? item.unidade}</TableCell>
                  <TableCell>{formatCurrencyOrHidden(Number(item.valorUnitario), canSeeValues)}</TableCell>
                  <TableCell>{formatCurrencyOrHidden(Number(item.valorTotal), canSeeValues)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {invoice.financialTransactions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium">Parcelas / Pagamentos</h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma de pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comprovante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.financialTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.parcelaNumero && transaction.parcelaTotal
                        ? `${transaction.parcelaNumero}/${transaction.parcelaTotal}`
                        : "Única"}
                    </TableCell>
                    <TableCell>{formatDateBR(transaction.dataVencimento)}</TableCell>
                    <TableCell>{formatCurrencyOrHidden(Number(transaction.valor), canSeeValues)}</TableCell>
                    <TableCell>
                      {transaction.formaPagamento ? PAYMENT_METHOD_LABELS[transaction.formaPagamento] : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={TRANSACTION_STATUS_BADGE[transaction.status]}
                        className={transaction.status === "VENCIDO" ? "animate-pulse-subtle" : undefined}
                      >
                        {TRANSACTION_STATUS_LABELS[transaction.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.comprovanteUrl ? (
                        <a
                          href={`/api/files?key=${encodeURIComponent(transaction.comprovanteUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Paperclip className="size-3.5" /> Ver
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {invoice.arquivoUrl || invoice.arquivoXmlUrl ? (
        <div className="flex gap-2">
          {invoice.arquivoUrl ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <a href={`/api/files?key=${encodeURIComponent(invoice.arquivoUrl)}`} target="_blank" rel="noopener noreferrer" />
              }
              nativeButton={false}
            >
              <Paperclip /> Ver anexo (PDF)
            </Button>
          ) : null}
          {invoice.arquivoXmlUrl ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <a href={`/api/files?key=${encodeURIComponent(invoice.arquivoXmlUrl)}`} target="_blank" rel="noopener noreferrer" />
              }
              nativeButton={false}
            >
              <Paperclip /> Ver XML anexado
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
