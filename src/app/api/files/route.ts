import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { presignGet } from "@/lib/r2";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Parâmetro key é obrigatório." }, { status: 400 });
  }

  try {
    const url = await presignGet(key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o link do arquivo." }, { status: 500 });
  }
}
