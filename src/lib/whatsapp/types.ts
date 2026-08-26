export type WhatsAppInboundMessage = {
  from: string;
  waMessageId: string;
  timestamp: string;
  type: string;
  text?: string;
  replyToMessageId?: string;
};

type RawWhatsAppMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  context?: { id?: string };
};

type RawWhatsAppWebhookPayload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        messages?: RawWhatsAppMessage[];
      };
    }[];
  }[];
};

export function extractInboundMessages(payload: unknown): WhatsAppInboundMessage[] {
  const body = payload as RawWhatsAppWebhookPayload;
  if (body?.object !== "whatsapp_business_account") return [];

  const messages: WhatsAppInboundMessage[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      for (const message of change.value?.messages ?? []) {
        messages.push({
          from: message.from,
          waMessageId: message.id,
          timestamp: message.timestamp,
          type: message.type,
          text: message.text?.body,
          replyToMessageId: message.context?.id,
        });
      }
    }
  }
  return messages;
}
