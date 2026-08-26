import { createHmac, timingSafeEqual } from "crypto";

/**
 * A Meta assina o corpo bruto do webhook com o App Secret (HMAC SHA-256) e envia
 * em `x-hub-signature-256: sha256=<hex>`. É preciso comparar contra o corpo
 * bruto (antes de qualquer JSON.parse) para o hash bater.
 */
export function isValidWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) {
    return false;
  }

  const [scheme, receivedHex] = signatureHeader.split("=");
  if (scheme !== "sha256" || !receivedHex) {
    return false;
  }

  const expectedHex = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
