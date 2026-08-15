import { ObraForm } from "@/components/obras/obra-form";
import { createWork } from "@/server/actions/obras";
import { listActiveProfessionals } from "@/server/actions/profissionais";

export default async function NovaObraPage() {
  const professionals = await listActiveProfessionals();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova obra</h1>
        <p className="text-muted-foreground">Cadastre uma nova obra para começar a lançar dados nela.</p>
      </div>
      <ObraForm action={createWork} submitLabel="Criar obra" professionals={professionals} />
    </div>
  );
}
