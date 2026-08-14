import { listIncomingNFes } from "@/server/actions/sefaz-radar";
import { RadarSyncButton } from "@/components/notas-fiscais/radar-sync-button";
import { IncomingNFeTable } from "@/components/notas-fiscais/incoming-nfe-table";

export default async function RadarNFePage() {
  const items = await listIncomingNFes();
  const itemsOptions = items.map((item) => ({
    ...item,
    valorTotal: item.valorTotal !== null ? Number(item.valorTotal) : null,
  }));
  const pendentes = itemsOptions.filter((item) => item.status === "PENDENTE").length;

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
    </div>
  );
}
