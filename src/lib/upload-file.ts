export type UploadCategory =
  | "rdo-fotos"
  | "notas-fiscais"
  | "contratos"
  | "medicoes"
  | "aditivos"
  | "comprovantes"
  | "company"
  | "obra-render";

export async function uploadFileToR2(
  file: File,
  category: UploadCategory,
  workId: string | null,
  entityId: string,
): Promise<string> {
  const presignResponse = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category,
      workId,
      entityId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });

  if (!presignResponse.ok) {
    throw new Error("Não foi possível preparar o upload do arquivo.");
  }

  const { uploadUrl, key } = (await presignResponse.json()) as { uploadUrl: string; key: string };

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error("Falha ao enviar o arquivo.");
  }

  return key;
}
