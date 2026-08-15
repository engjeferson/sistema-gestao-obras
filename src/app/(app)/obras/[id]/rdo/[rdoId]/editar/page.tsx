import { notFound } from "next/navigation";
import { getRdo, listPlanningTasksForPicker, updateRdo } from "@/server/actions/rdo";
import { RdoForm } from "@/components/rdo/rdo-form";

export default async function EditarRdoPage({ params }: { params: Promise<{ id: string; rdoId: string }> }) {
  const { id, rdoId } = await params;
  const [rdo, stages] = await Promise.all([getRdo(rdoId), listPlanningTasksForPicker(id)]);
  if (!rdo) {
    notFound();
  }

  const updateRdoWithId = updateRdo.bind(null, rdo.id);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar RDO #{rdo.numero}</h1>
      </div>
      <RdoForm
        action={updateRdoWithId}
        workId={id}
        stages={stages}
        numero={rdo.numero}
        submitLabel="Salvar alterações"
        defaultValues={{
          data: rdo.data.toISOString().slice(0, 10),
          clima: rdo.clima ?? "",
          observacoesGerais: rdo.observacoesGerais ?? "",
          workers: rdo.workers.map((w) => ({ funcao: w.funcao, quantidade: w.quantidade })),
          activities: rdo.activities.map((a) => ({
            planningTaskId: a.planningTaskId,
            descricaoServico: a.descricaoServico,
            percentualAtual: Number(a.percentualAtual),
          })),
          occurrences: rdo.occurrences.map((o) => ({ tipo: o.tipo, descricao: o.descricao })),
          photos: rdo.photos.map((p) => ({ url: p.url, descricao: p.descricao ?? undefined })),
        }}
      />
    </div>
  );
}
