import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Etapa = { id: string; nome: string; percentualExecutado: number };

export function PortalStagesList({ token, etapas }: { token: string; etapas: Etapa[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Toque numa etapa para ver as fotos relacionadas a ela.</p>
        {etapas.map((etapa) => {
          const etapaProgresso = Math.min(100, Math.max(0, etapa.percentualExecutado));
          return (
            <Link
              key={etapa.id}
              href={`/portal/${token}/galeria?etapa=${etapa.id}`}
              className="flex flex-col gap-1 text-left"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{etapa.nome}</span>
                <span className="text-muted-foreground">{etapaProgresso.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${etapaProgresso}%` }} />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
