import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export type EncryptedPayload = {
  data: Buffer;
  iv: Buffer;
  authTag: Buffer;
};

/**
 * CERT_ENCRYPTION_KEY precisa ser uma chave de 32 bytes em hex (64 caracteres).
 * Gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getKey(): Buffer {
  const hex = process.env.CERT_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("CERT_ENCRYPTION_KEY não configurada.");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("CERT_ENCRYPTION_KEY deve ser uma chave hex de 32 bytes (64 caracteres).");
  }
  return key;
}

export function encryptBuffer(plain: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { data, iv, authTag: cipher.getAuthTag() };
}

export function decryptBuffer(payload: EncryptedPayload): Buffer {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), payload.iv);
  decipher.setAuthTag(payload.authTag);
  return Buffer.concat([decipher.update(payload.data), decipher.final()]);
}

export function encryptText(plain: string): EncryptedPayload {
  return encryptBuffer(Buffer.from(plain, "utf8"));
}

export function decryptText(payload: EncryptedPayload): string {
  return decryptBuffer(payload).toString("utf8");
}
