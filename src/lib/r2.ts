import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const bucketName = process.env.R2_BUCKET_NAME as string;

export const r2Client = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

type UploadCategory = "rdo-fotos" | "notas-fiscais" | "contratos" | "medicoes" | "company";

export function buildKey(category: UploadCategory, workId: string | null, entityId: string, filename: string) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniquePrefix = randomUUID();
  const base =
    category === "company"
      ? `company`
      : `obras/${workId}/${category === "rdo-fotos" ? "rdo" : category}`;
  const middle = category === "rdo-fotos" ? `${entityId}/fotos` : entityId;
  return category === "company"
    ? `${base}/${uniquePrefix}-${safeFilename}`
    : `${base}/${middle}/${uniquePrefix}-${safeFilename}`;
}

export async function presignPut(key: string, contentType: string, expiresInSeconds = 300) {
  const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: contentType });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

export async function presignGet(key: string, expiresInSeconds = 600) {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

export async function getObjectBase64(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const response = await r2Client.send(command);
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`Objeto não encontrado no R2: ${key}`);
  }
  return Buffer.from(bytes).toString("base64");
}
