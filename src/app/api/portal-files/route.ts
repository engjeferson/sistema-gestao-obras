import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { presignGet } from "@/lib/r2";

// Proxy publico (sem autenticacao) pras fotos do portal do cliente — evita expor URLs assinadas
// direto no HTML/CORS do R2 e só libera chaves que realmente pertencem à obra do token informado.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const key = searchParams.get("key");
  if (!token || !key) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const work = await prisma.work.findUnique({
    where: { portalToken: token },
    select: { id: true, renderUrl: true },
  });
  if (!work) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const isRender = !!work.renderUrl && key === work.renderUrl;
  const isRdoPhoto = isRender
    ? true
    : Boolean(await prisma.rdoPhoto.findFirst({ where: { url: key, rdo: { workId: work.id } }, select: { id: true } }));
  if (!isRdoPhoto) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  try {
    const url = await presignGet(key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o link do arquivo." }, { status: 500 });
  }
}
