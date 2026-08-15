import { notFound } from "next/navigation";
import { CloudSun } from "lucide-react";
import { getPortalData } from "@/server/actions/portal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WORK_STATUS_BADGE, WORK_STATUS_LABELS, formatDateBR } from "@/lib/status-labels";

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPortalData(token);
  if (!data) {
    notFound();
  }

  const progresso = Math.min(100, Math.max(0, data.percentualExecutado));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-1 pt-6">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{data.nome}</h1>
            <Badge variant={WORK_STATUS_BADGE[data.status]}>{WORK_STATUS_LABELS[data.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.codigo}
            {data.clienteNome ? ` · ${data.clienteNome}` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral da obra</span>
            <span className="font-semibold">{progresso.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success" style={{ width: `${progresso}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
            <div>
              <p className="text-muted-foreground">Dias decorridos</p>
              <p className="font-medium">{data.diasDecorridos}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Previsão de entrega</p>
              <p className="font-medium">{formatDateBR(data.dataPrevistaTermino)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.etapas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Etapas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.etapas.map((etapa) => {
              const etapaProgresso = Math.min(100, Math.max(0, etapa.percentualExecutado));
              return (
                <div key={etapa.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{etapa.nome}</span>
                    <span className="text-muted-foreground">{etapaProgresso.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${etapaProgresso}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Diário de obra</h2>
        {data.rdos.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            Nenhum registro de andamento ainda.
          </p>
        ) : (
          data.rdos.map((rdo) => (
            <Card key={rdo.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>RDO nº {rdo.numero}</span>
                  <span className="text-sm font-normal text-muted-foreground">{formatDateBR(rdo.data)}</span>
                </CardTitle>
                {rdo.clima ? (
                  <CardDescription className="flex items-center gap-1.5">
                    <CloudSun className="size-3.5" /> {rdo.clima}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {rdo.atividades.length > 0 ? (
                  <ul className="flex flex-col gap-1 text-sm">
                    {rdo.atividades.map((atividade, index) => (
                      <li key={index} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">{atividade.atividadeNome}</span>
                        <span className="shrink-0 text-muted-foreground">{atividade.percentualAtual.toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {rdo.observacoesGerais ? (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{rdo.observacoesGerais}</p>
                ) : null}
                {rdo.fotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {rdo.fotos.map((foto, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={index}
                        src={foto.url}
                        alt={foto.descricao ?? "Foto da obra"}
                        className="aspect-square w-full rounded-md border object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
