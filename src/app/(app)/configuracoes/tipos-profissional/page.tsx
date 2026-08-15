import { listAllProfessionalTypes } from "@/server/actions/tipos-profissional";
import { ProfessionalTypeForm } from "@/components/configuracoes/professional-type-form";
import { ProfessionalTypesTable } from "@/components/configuracoes/professional-types-table";

export default async function TiposProfissionalPage() {
  const types = await listAllProfessionalTypes();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tipos de profissional</h1>
        <p className="text-muted-foreground">Usados no cadastro de Profissionais e em Responsável técnico/Encarregado das obras.</p>
      </div>
      <ProfessionalTypeForm />
      <ProfessionalTypesTable types={types} />
    </div>
  );
}
