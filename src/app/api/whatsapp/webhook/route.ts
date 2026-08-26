import { NextRequest, NextResponse } from "next/server";
import { isValidWhatsAppSignature } from "@/lib/whatsapp/verify-signature";
import { extractInboundMessages } from "@/lib/whatsapp/types";
import { handleIncomingWhatsAppMessage } from "@/server/services/agenda/handle-incoming-message";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidWhatsAppSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const messages = extractInboundMessages(payload);
  for (const message of messages) {
    try {
      await handleIncomingWhatsAppMessage(message);
    } catch (error) {
      console.error("[whatsapp-webhook] erro ao processar mensagem", error);
    }
  }

  return NextResponse.json({ received: true });
}
