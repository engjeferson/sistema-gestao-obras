const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

function getConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID precisam estar configurados.");
  }
  return { token, phoneNumberId };
}

type SendTextResult = { messageId: string };

export async function sendWhatsAppText(to: string, body: string, replyToMessageId?: string): Promise<SendTextResult> {
  const { token, phoneNumberId } = getConfig();

  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao enviar mensagem no WhatsApp (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { messages?: { id: string }[] };
  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new Error("Resposta da API do WhatsApp sem id de mensagem.");
  }
  return { messageId };
}
