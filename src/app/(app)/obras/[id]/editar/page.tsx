import { notFound } from "next/navigation";
import { getWork, updateWork, listActiveUsers } from "@/server/actions/obras";
import { ObraForm } from "@/components/obras/obra-form";

export default async function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [work, users] = await Promise.all([getWork(id), listActiveUsers()]);
  if (!work) {
    notFound();
  }

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
          clienteNome: work.client?.nome,
        }}
        submitLabel="Salvar alterações"
        users={users}
      />
    </div>
  );
}
