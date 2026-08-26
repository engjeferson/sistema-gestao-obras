import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import type { WhatsAppInboundMessage } from "@/lib/whatsapp/types";
import { formatAgendaDateTime } from "@/lib/agenda-format";
import { parseScheduleMessage } from "./parse-message";

const NAO_CADASTRADO_MSG =
  "Esse número ainda não está vinculado a nenhum usuário do sistema. Peça para um administrador cadastrar seu WhatsApp em Configurações > Usuários.";
const SO_TEXTO_MSG = "Por enquanto eu só entendo mensagens de texto. Me conta seu compromisso com data e horário 🙂";
const SEM_REFERENCIA_MSG =
  "Não achei qual compromisso você quer alterar. Responda diretamente à mensagem de confirmação do evento.";

async function reply(to: string, body: string, replyToMessageId: string) {
  try {
    return await sendWhatsAppText(to, body, replyToMessageId);
  } catch (error) {
    console.error("[agenda] falha ao responder no WhatsApp", error);
    return null;
  }
}

export async function handleIncomingWhatsAppMessage(message: WhatsAppInboundMessage): Promise<void> {
  const account = await prisma.whatsAppAccount.findUnique({ where: { telefone: message.from } });
  if (!account) {
    await reply(message.from, NAO_CADASTRADO_MSG, message.waMessageId);
    return;
  }

  if (message.type !== "text" || !message.text?.trim()) {
    await reply(message.from, SO_TEXTO_MSG, message.waMessageId);
    return;
  }

  const referencedEvent = message.replyToMessageId
    ? await prisma.agendaEvent.findUnique({ where: { whatsappMessageId: message.replyToMessageId } })
    : null;

  const parsed = await parseScheduleMessage({
    text: message.text,
    now: new Date(),
    hasReferencedEvent: Boolean(referencedEvent),
  });

  if (parsed.intent === "duvida") {
    await reply(message.from, parsed.pergunta, message.waMessageId);
    return;
  }

  if (parsed.intent === "cancelar") {
    if (!referencedEvent) {
      await reply(message.from, SEM_REFERENCIA_MSG, message.waMessageId);
      return;
    }
    await prisma.agendaEvent.update({ where: { id: referencedEvent.id }, data: { status: "CANCELADO" } });
    await reply(message.from, `❌ Compromisso cancelado: ${referencedEvent.titulo}`, message.waMessageId);
    return;
  }

  if (parsed.intent === "editar") {
    if (!referencedEvent) {
      await reply(message.from, SEM_REFERENCIA_MSG, message.waMessageId);
      return;
    }
    const updated = await prisma.agendaEvent.update({
      where: { id: referencedEvent.id },
      data: {
        titulo: parsed.titulo ?? referencedEvent.titulo,
        descricao: parsed.descricao ?? referencedEvent.descricao,
        local: parsed.local ?? referencedEvent.local,
        inicio: parsed.inicio ? new Date(parsed.inicio) : referencedEvent.inicio,
        fim: parsed.fim ? new Date(parsed.fim) : referencedEvent.fim,
        lembreteEnviadoEm: null,
      },
    });
    await reply(
      message.from,
      `✏️ Compromisso atualizado: ${updated.titulo}\n📅 ${formatAgendaDateTime(updated.inicio, updated.diaTodo)}${updated.local ? `\n📍 ${updated.local}` : ""}`,
      message.waMessageId,
    );
    return;
  }

  // intent === "criar"
  const created = await prisma.agendaEvent.create({
    data: {
      titulo: parsed.titulo,
      descricao: parsed.descricao,
      local: parsed.local,
      inicio: new Date(parsed.inicio),
      fim: parsed.fim ? new Date(parsed.fim) : null,
      diaTodo: parsed.diaTodo,
      origem: "WHATSAPP",
      status: "CONFIRMADO",
      createdById: account.userId,
      mensagemOriginal: message.text,
      whatsappTelefone: message.from,
    },
  });

  const confirmationText = [
    `✅ Compromisso agendado: ${created.titulo}`,
    `📅 ${formatAgendaDateTime(created.inicio, created.diaTodo)}`,
    created.local ? `📍 ${created.local}` : null,
    "Para cancelar ou mudar o horário, responda esta mensagem.",
  ]
    .filter(Boolean)
    .join("\n");

  const sent = await reply(message.from, confirmationText, message.waMessageId);
  if (sent) {
    await prisma.agendaEvent.update({ where: { id: created.id }, data: { whatsappMessageId: sent.messageId } });
  }
}
