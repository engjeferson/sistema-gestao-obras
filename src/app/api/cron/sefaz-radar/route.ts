import { NextResponse } from "next/server";
import { cronSyncIncomingNFes } from "@/server/actions/sefaz-radar";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sincroniza o Radar de NF-e em segundo plano, sem depender de alguém abrir a tela. O próprio
 * runIncomingNFeSync já respeita o cooldown local (espelhando o da SEFAZ), então é seguro essa
 * rota ser chamada com mais frequência do que o cooldown permite — tentativas de mais só são
 * ignoradas (status "skipped"), nunca disparam consultas extras à SEFAZ.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const result = await cronSyncIncomingNFes();
  return NextResponse.json(result);
}
