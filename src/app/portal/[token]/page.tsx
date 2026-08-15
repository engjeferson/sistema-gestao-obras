import { notFound } from "next/navigation";
import { getPortalData } from "@/server/actions/portal";
import { PortalCalendar } from "@/components/portal/portal-calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      {data.renderUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.renderUrl}
          alt={`Render de ${data.nome}`}
          className="aspect-video w-full rounded-lg border object-cover"
        />
      ) : null}

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
          <div className="grid grid-cols-3 gap-2 pt-1 text-sm">
            <div>
              <p className="text-muted-foreground">Início</p>
              <p className="font-medium">{formatDateBR(data.dataInicio)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Previsão</p>
              <p className="font-medium">{formatDateBR(data.dataPrevistaTermino)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dias corridos</p>
              <p className="font-medium">{data.diasDecorridos}</p>
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
        {data.rdoDates.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            Nenhum registro de andamento ainda.
          </p>
        ) : (
          <PortalCalendar token={token} rdoDates={data.rdoDates} />
        )}
      </div>
    </div>
  );
}
