import { notFound } from "next/navigation";
import { getWork, updateWork } from "@/server/actions/obras";
import { listActiveProfessionals } from "@/server/actions/profissionais";
import { listClients } from "@/server/actions/clientes";
import { ObraForm } from "@/components/obras/obra-form";
import { presignGet } from "@/lib/r2";

export default async function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [work, professionals, clients] = await Promise.all([
    getWork(id),
    listActiveProfessionals(),
    listClients(),
  ]);
  if (!work) {
    notFound();
  }

  const renderPreviewUrl = work.renderUrl ? await presignGet(work.renderUrl) : null;
  const updateWorkWithId = updateWork.bind(null, work.id);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar obra</h1>
      </div>
      <ObraForm
        action={updateWorkWithId}
        defaultValues={{
          ...work,
          valorContrato: Number(work.valorContrato),
          areaConstruida: work.areaConstruida !== null ? Number(work.areaConstruida) : null,
        }}
        submitLabel="Salvar alterações"
        professionals={professionals}
        clients={clients}
        renderPreviewUrl={renderPreviewUrl}
      />
    </div>
  );
}
