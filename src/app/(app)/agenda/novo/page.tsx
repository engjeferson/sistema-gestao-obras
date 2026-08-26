import { AgendaEventForm } from "@/components/agenda/agenda-event-form";
import { createAgendaEvent } from "@/server/actions/agenda";
import { listWorks } from "@/server/actions/obras";
import { listClients } from "@/server/actions/clientes";

export default async function NovoAgendaEventPage() {
  const [works, clients] = await Promise.all([listWorks(), listClients()]);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Novo compromisso</h2>
      <AgendaEventForm
        action={createAgendaEvent}
        works={works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }))}
        clients={clients.map((c) => ({ id: c.id, nome: c.nome }))}
        submitLabel="Criar compromisso"
      />
    </div>
  );
}
