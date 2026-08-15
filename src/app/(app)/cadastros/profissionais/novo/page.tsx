import { ProfessionalForm } from "@/components/cadastros/professional-form";
import { createProfessional } from "@/server/actions/profissionais";
import { listProfessionalTypes } from "@/server/actions/tipos-profissional";

export default async function NovoProfissionalPage() {
  const types = await listProfessionalTypes();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Novo profissional</h2>
      <ProfessionalForm action={createProfessional} submitLabel="Criar profissional" types={types} />
    </div>
  );
}
