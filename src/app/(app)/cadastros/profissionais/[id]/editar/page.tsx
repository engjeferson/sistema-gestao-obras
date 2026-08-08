import { notFound } from "next/navigation";
import { ProfessionalForm } from "@/components/cadastros/professional-form";
import { getProfessional, updateProfessional } from "@/server/actions/profissionais";

export default async function EditarProfissionalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const professional = await getProfessional(id);
  if (!professional) {
    notFound();
  }

  const updateProfessionalWithId = updateProfessional.bind(null, professional.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar profissional</h2>
      <ProfessionalForm
        action={updateProfessionalWithId}
        defaultValues={professional}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
