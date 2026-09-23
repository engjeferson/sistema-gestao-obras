"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPhotoGallery } from "@/components/portal/portal-photo-gallery";
import { getPortalStagePhotos } from "@/server/actions/portal";

type Etapa = { id: string; nome: string; percentualExecutado: number };
type StagePhotos = Awaited<ReturnType<typeof getPortalStagePhotos>>;

export function PortalStagesList({ token, etapas }: { token: string; etapas: Etapa[] }) {
  const [openStageId, setOpenStageId] = useState<string | null>(null);
  const [stagePhotos, setStagePhotos] = useState<StagePhotos>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(stageId: string) {
    if (openStageId === stageId) {
      setOpenStageId(null);
      setStagePhotos(null);
      return;
    }
    setOpenStageId(stageId);
    setStagePhotos(null);
    startTransition(async () => {
      const result = await getPortalStagePhotos(token, stageId);
      setStagePhotos(result);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Toque numa etapa para ver as fotos relacionadas a ela.</p>
        {etapas.map((etapa) => {
          const etapaProgresso = Math.min(100, Math.max(0, etapa.percentualExecutado));
          const isOpen = openStageId === etapa.id;
          return (
            <div key={etapa.id} className="flex flex-col gap-1.5">
              <button type="button" onClick={() => handleToggle(etapa.id)} className="flex flex-col gap-1 text-left">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>{etapa.nome}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {etapaProgresso.toFixed(0)}%
                    {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${etapaProgresso}%` }} />
                </div>
              </button>

              {isOpen ? (
                <div className="flex flex-col gap-2 border-t pt-2 pb-1">
                  {isPending && !stagePhotos ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : stagePhotos && stagePhotos.fotos.length > 0 ? (
                    <PortalPhotoGallery photos={stagePhotos.fotos} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma foto vinculada a esta etapa ainda.</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
