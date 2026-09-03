import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, FileDown } from "lucide-react";
import { getStockTransferByGrupoId } from "@/server/actions/estoque";
import { getCurrentSensitiveValuesAccess } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { formatCurrencyOrHidden, formatDateBR } from "@/lib/status-labels";

function localLabel(work: { nome: string; codigo: string } | null) {
  return work ? `${work.codigo} — ${work.nome}` : "Estoque Geral";
}

export default async function TransferenciaConfirmadaPage({
  params,
}: {
  params: Promise<{ grupoId: string }>;
}) {
  const { grupoId } = await params;
  const [transfer, canSeeValues] = await Promise.all([
    getStockTransferByGrupoId(grupoId),
    getCurrentSensitiveValuesAccess(),
  ]);
  if (!transfer) {
    notFound();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <Link
          href="/estoque"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar para o estoque
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-4 text-success">
        <CircleCheck className="size-5 shrink-0" />
        <p className="text-sm font-medium">
          Transferência {transfer.numeroOS ? `nº ${transfer.numeroOS}` : ""} registrada com sucesso.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Origem</p>
            <p className="font-medium">{localLabel(transfer.origemWork)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Destino</p>
            <p className="font-medium">{localLabel(transfer.destinoWork)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-medium">{formatDateBR(transfer.data)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lançado por</p>
            <p className="font-medium">{transfer.createdBy.name}</p>
          </div>
          {transfer.motivo ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Motivo / observação</p>
              <p className="font-medium">{transfer.motivo}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Itens transferidos</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Material</th>
                  <th className="p-2">Quantidade</th>
                  <th className="p-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transfer.itens.map((item, index) => (
                  <tr key={`${item.material.id}-${index}`} className="border-t">
                    <td className="p-2 font-medium">{item.material.nome}</td>
                    <td className="p-2">
                      {item.quantidade} {item.material.unidadePadrao ?? ""}
                    </td>
                    <td className="p-2">
                      {item.valorUnitario !== null
                        ? formatCurrencyOrHidden(item.valorUnitario * item.quantidade, canSeeValues)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button render={<a href={`/api/estoque/transferencias/${grupoId}/pdf`} target="_blank" />} nativeButton={false}>
          <FileDown /> Gerar OS (PDF)
        </Button>
        <Button variant="outline" render={<Link href="/estoque/nova-transferencia" />} nativeButton={false}>
          Nova transferência
        </Button>
      </div>
    </div>
  );
}
