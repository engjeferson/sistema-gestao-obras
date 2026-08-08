import { notFound } from "next/navigation";
import { ClientForm } from "@/components/cadastros/client-form";
import { getClient, updateClient } from "@/server/actions/clientes";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) {
    notFound();
  }

  const updateClientWithId = updateClient.bind(null, client.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar cliente</h2>
      <ClientForm action={updateClientWithId} defaultValues={client} submitLabel="Salvar alterações" />
    </div>
  );
}
