import { ProfessionalForm } from "@/components/cadastros/professional-form";
import { createProfessional } from "@/server/actions/profissionais";

export default function NovoProfissionalPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Novo profissional</h2>
      <ProfessionalForm action={createProfessional} submitLabel="Criar profissional" />
    </div>
  );
}
