import { ClientForm } from "@/components/cadastros/client-form";
import { createClient } from "@/server/actions/clientes";

export default function NovoClientePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Novo cliente</h2>
      <ClientForm action={createClient} submitLabel="Criar cliente" />
    </div>
  );
}
