import { ObraForm } from "@/components/obras/obra-form";
import { createWork, listActiveUsers } from "@/server/actions/obras";

export default async function NovaObraPage() {
  const users = await listActiveUsers();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova obra</h1>
        <p className="text-muted-foreground">Cadastre uma nova obra para começar a lançar dados nela.</p>
      </div>
      <ObraForm action={createWork} submitLabel="Criar obra" users={users} />
    </div>
  );
}
