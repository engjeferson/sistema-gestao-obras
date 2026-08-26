import { notFound } from "next/navigation";
import { AgendaEventForm } from "@/components/agenda/agenda-event-form";
import { getAgendaEvent, updateAgendaEvent } from "@/server/actions/agenda";
import { listWorks } from "@/server/actions/obras";
import { listClients } from "@/server/actions/clientes";

export default async function EditarAgendaEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, works, clients] = await Promise.all([getAgendaEvent(id), listWorks(), listClients()]);
  if (!event) {
    notFound();
  }

  const updateWithId = updateAgendaEvent.bind(null, event.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Editar compromisso</h2>
      <AgendaEventForm
        action={updateWithId}
        works={works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }))}
        clients={clients.map((c) => ({ id: c.id, nome: c.nome }))}
        defaultValues={event}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
