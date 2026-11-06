import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { presignGet } from "@/lib/r2";
import { getCurrentWorkAccess } from "@/server/actions/permissions";
import { canAccessWork } from "@/lib/work-access";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Parâmetro key é obrigatório." }, { status: 400 });
  }

  // Chaves no formato obras/{workId}/... carregam qual obra o arquivo pertence (ver buildKey em
  // src/lib/r2.ts) — sem checar isso aqui, estar logado bastava pra baixar o arquivo de QUALQUER
  // obra, inclusive driblando a restrição de "restringirObras" que algumas contas têm. Chaves
  // fora desse padrão (ex: company/...) não são por obra, então não há o que restringir.
  const obraMatch = key.match(/^obras\/([^/]+)\//);
  if (obraMatch) {
    const workAccess = await getCurrentWorkAccess();
    if (!canAccessWork(workAccess, obraMatch[1])) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }
  }

  try {
    const url = await presignGet(key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o link do arquivo." }, { status: 500 });
  }
}
