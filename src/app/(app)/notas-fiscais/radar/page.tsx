import { listIncomingNFes, countPendingIncomingNFes } from "@/server/actions/sefaz-radar";
import { RadarSyncButton } from "@/components/notas-fiscais/radar-sync-button";
import { IncomingNFeTable } from "@/components/notas-fiscais/incoming-nfe-table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default async function RadarNFePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = Number(pageSizeParam) > 0 ? Number(pageSizeParam) : 20;

  const [result, pendentes] = await Promise.all([
    listIncomingNFes(page, pageSize),
    countPendingIncomingNFes(),
  ]);

  const itemsOptions = result.items.map((item) => ({
    id: item.id,
    chaveAcesso: item.chaveAcesso,
    emitenteCnpj: item.emitenteCnpj,
    emitenteNome: item.emitenteNome,
    numero: item.numero,
    serie: item.serie,
    dataEmissao: item.dataEmissao,
    valorTotal: item.valorTotal !== null ? Number(item.valorTotal) : null,
    status: item.status,
    invoiceLink: item.invoice
      ? {
          invoiceId: item.invoice.id,
          workId: item.invoice.workId,
          workLabel: item.invoice.work ? `${item.invoice.work.codigo} — ${item.invoice.work.nome}` : null,
        }
      : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Radar de NF-e</h1>
          <p className="text-muted-foreground">
            Notas fiscais emitidas contra o CNPJ da empresa, consultadas direto na SEFAZ.
            {pendentes > 0 ? ` ${pendentes} nova(s) aguardando revisão.` : ""}
          </p>
        </div>
        <RadarSyncButton />
      </div>

      <IncomingNFeTable items={itemsOptions} />
      <PaginationControls page={result.page} totalPages={result.totalPages} pageSize={result.pageSize} />
    </div>
  );
}
