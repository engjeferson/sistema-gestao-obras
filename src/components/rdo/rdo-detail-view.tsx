import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateBR } from "@/lib/status-labels";
import type { getRdo } from "@/server/actions/rdo";

const OCCURRENCE_LABELS: Record<string, string> = {
  PROBLEMA: "Problema",
  ATRASO: "Atraso",
  FALTA_MATERIAL: "Falta de material",
  ALTERACAO: "Alteração",
  VISITA: "Visita",
  OBSERVACAO: "Observação",
};

type RdoWithRelations = NonNullable<Awaited<ReturnType<typeof getRdo>>>;

export function RdoDetailView({
  rdo,
  basePath,
  canEdit = true,
}: {
  rdo: RdoWithRelations;
  basePath: string;
  canEdit?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RDO #{rdo.numero}</h1>
          <p className="text-muted-foreground">
            {formatDateBR(rdo.data)} · {rdo.responsavel.name}
            {rdo.clima ? ` · ${rdo.clima}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`${basePath}/rdo/${rdo.id}/editar`} />}
              nativeButton={false}
            >
              <Pencil /> Editar
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/api/rdo/${rdo.id}/pdf`} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
          >
            <Download /> Baixar PDF
          </Button>
        </div>
      </div>

      {rdo.workers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Equipe presente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {rdo.workers.map((w) => (
              <Badge key={w.id} variant="secondary">
                {w.funcao}: {w.quantidade}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {rdo.activities.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Atividades executadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rdo.activities.map((a) => (
              <div key={a.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">
                  {a.planningTask
                    ? `${a.planningTask.stage.nome} — ${a.planningTask.nome}`
                    : `${a.planningStage?.nome} (etapa completa)`}
                </p>
                {a.descricaoServico ? <p className="text-sm text-muted-foreground">{a.descricaoServico}</p> : null}
                <p className="text-sm">
                  {Number(a.percentualAnterior).toFixed(0)}% → {Number(a.percentualAtual).toFixed(0)}%
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {rdo.photos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Fotos ({rdo.photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{rdo.photos.length} foto(s) anexada(s) a este RDO.</p>
          </CardContent>
        </Card>
      ) : null}

      {rdo.occurrences.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {rdo.occurrences.map((o) => (
              <div key={o.id} className="text-sm">
                <Badge variant="warning" className="mr-2">
                  {OCCURRENCE_LABELS[o.tipo]}
                </Badge>
                {o.descricao}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {rdo.observacoesGerais ? (
        <Card>
          <CardHeader>
            <CardTitle>Observações gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{rdo.observacoesGerais}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
