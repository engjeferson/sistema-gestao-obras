import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { formatAgendaTime } from "@/lib/agenda-format";

const LEMBRETE_ANTECEDENCIA_MINUTOS = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const limite = new Date(now.getTime() + LEMBRETE_ANTECEDENCIA_MINUTOS * 60 * 1000);

  const events = await prisma.agendaEvent.findMany({
    where: {
      status: "CONFIRMADO",
      diaTodo: false,
      lembreteEnviadoEm: null,
      inicio: { gte: now, lte: limite },
    },
    include: { createdBy: { include: { whatsappAccount: true } } },
  });

  let enviados = 0;
  for (const event of events) {
    const telefone = event.createdBy?.whatsappAccount?.telefone;
    if (telefone) {
      try {
        await sendWhatsAppText(
          telefone,
          `⏰ Lembrete: ${event.titulo} às ${formatAgendaTime(event.inicio)}${event.local ? ` (${event.local})` : ""}`,
        );
        enviados++;
      } catch (error) {
        console.error("[cron/lembretes-agenda] falha ao enviar lembrete", event.id, error);
        continue;
      }
    }
    await prisma.agendaEvent.update({ where: { id: event.id }, data: { lembreteEnviadoEm: now } });
  }

  return NextResponse.json({ verificados: events.length, enviados });
}
