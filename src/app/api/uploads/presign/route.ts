import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildKey, presignPut } from "@/lib/r2";

const ALLOWED_CATEGORIES = [
  "rdo-fotos",
  "notas-fiscais",
  "contratos",
  "medicoes",
  "aditivos",
  "comprovantes",
  "company",
  "obra-render",
] as const;
type UploadCategory = (typeof ALLOWED_CATEGORIES)[number];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const { category, workId, entityId, filename, contentType } = body as {
    category: UploadCategory;
    workId: string | null;
    entityId: string;
    filename: string;
    contentType: string;
  };

  if (!ALLOWED_CATEGORIES.includes(category) || !entityId || !filename || !contentType) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const key = buildKey(category, workId, entityId, filename);
  const uploadUrl = await presignPut(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
