"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClimaPicker } from "@/components/rdo/clima-picker";
import { RdoWorkersEditor } from "@/components/rdo/rdo-workers-editor";
import { RdoActivitiesEditor, type StageOption } from "@/components/rdo/rdo-activities-editor";
import { RdoOccurrencesEditor } from "@/components/rdo/rdo-occurrences-editor";
import { RdoPhotosEditor } from "@/components/rdo/rdo-photos-editor";
import type { RdoWorkerValues, RdoActivityValues, RdoOccurrenceValues, RdoPhotoValues } from "@/lib/validations/rdo";

export function RdoForm({
  action,
  workId,
  stages,
  proximoNumero,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  workId: string;
  stages: StageOption[];
  proximoNumero: number;
}) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [workers, setWorkers] = useState<RdoWorkerValues[]>([]);
  const [activities, setActivities] = useState<RdoActivityValues[]>([]);
  const [occurrences, setOccurrences] = useState<RdoOccurrenceValues[]>([]);
  const [photos, setPhotos] = useState<RdoPhotoValues[]>([]);
  const [clima, setClima] = useState("");
  const draftId = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="workersJson" value={JSON.stringify(workers)} readOnly />
      <input type="hidden" name="activitiesJson" value={JSON.stringify(activities)} readOnly />
      <input type="hidden" name="occurrencesJson" value={JSON.stringify(occurrences)} readOnly />
      <input type="hidden" name="photosJson" value={JSON.stringify(photos)} readOnly />

      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">RDO nº {proximoNumero}</p>
      </div>

      <input type="hidden" name="clima" value={clima} readOnly />

      <div className="flex flex-col gap-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          name="data"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="max-w-xs"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Clima</Label>
        <ClimaPicker value={clima} onChange={setClima} />
      </div>

      <section className="flex flex-col gap-2">
        <Label>Equipe presente</Label>
        <RdoWorkersEditor workers={workers} onChange={setWorkers} />
      </section>

      <section className="flex flex-col gap-2">
        <Label>Atividades executadas</Label>
        <RdoActivitiesEditor activities={activities} onChange={setActivities} stages={stages} />
      </section>

      <section className="flex flex-col gap-2">
        <Label>Fotos</Label>
        <RdoPhotosEditor photos={photos} onChange={setPhotos} workId={workId} draftId={draftId} />
      </section>

      <section className="flex flex-col gap-2">
        <Label>Ocorrências</Label>
        <RdoOccurrencesEditor occurrences={occurrences} onChange={setOccurrences} />
      </section>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoesGerais">Observações gerais</Label>
        <Textarea id="observacoesGerais" name="observacoesGerais" />
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar RDO"}
        </Button>
      </div>
    </form>
  );
}
