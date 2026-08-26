import Link from "next/link";
import { Plus } from "lucide-react";
import { listAgendaEvents } from "@/server/actions/agenda";
import { getMyWhatsAppAccount } from "@/server/actions/whatsapp-conta";
import { Button } from "@/components/ui/button";
import { AgendaCalendar, type AgendaEventListItem } from "@/components/agenda/agenda-calendar";
import { WhatsAppLinkCard } from "@/components/agenda/whatsapp-link-card";

function currentYearMonthSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  return { year, month };
}

function monthRange(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = new Date(`${year}-${pad(month + 1)}-01T00:00:00-03:00`);
  const nextMonth = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const end = new Date(`${nextMonth.y}-${pad(nextMonth.m + 1)}-01T00:00:00-03:00`);
  return { start, end };
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const defaultYearMonth = currentYearMonthSaoPaulo();
  const year = params.ano ? Number(params.ano) : defaultYearMonth.year;
  const month = params.mes ? Number(params.mes) - 1 : defaultYearMonth.month - 1;

  const { start, end } = monthRange(year, month);

  const [events, whatsappAccount] = await Promise.all([listAgendaEvents({ start, end }), getMyWhatsAppAccount()]);

  const eventItems: AgendaEventListItem[] = events.map((event) => ({
    id: event.id,
    titulo: event.titulo,
    local: event.local,
    inicio: event.inicio.toISOString(),
    fim: event.fim ? event.fim.toISOString() : null,
    diaTodo: event.diaTodo,
    status: event.status,
    origem: event.origem,
    work: event.work ? { id: event.work.id, nome: event.work.nome, codigo: event.work.codigo } : null,
    client: event.client ? { id: event.client.id, nome: event.client.nome } : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground">Seus compromissos, criados manualmente ou pelo WhatsApp.</p>
        </div>
        <Button className="rounded-full" render={<Link href="/agenda/novo" />} nativeButton={false}>
          <Plus /> Novo compromisso
        </Button>
      </div>

      <WhatsAppLinkCard telefone={whatsappAccount?.telefone ?? null} />

      <AgendaCalendar year={year} month={month} events={eventItems} />
    </div>
  );
}
