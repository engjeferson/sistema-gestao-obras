import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import bwipjs from "bwip-js/node";
import { auth } from "@/lib/auth";
import { getIncomingNFeXml } from "@/server/actions/sefaz-radar";
import { parseNFeCompleta } from "@/lib/sefaz/parse-nfe-full";
import { NFePdfDocument } from "@/server/services/pdf/nfe-pdf";

export const runtime = "nodejs";

async function gerarBarcodeBase64(chaveAcesso: string | null): Promise<string | null> {
  if (!chaveAcesso) return null;
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: chaveAcesso,
      height: 12,
      includetext: false,
      scale: 3,
    });
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

function errorPage(message: string, status: number) {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>PDF indisponível</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;background:#f8f8f7;color:#1a1a1a}
.card{max-width:32rem;text-align:center}h1{font-size:1.125rem;margin-bottom:0.5rem}p{color:#555;line-height:1.5}</style>
</head><body><div class="card"><h1>Não foi possível gerar o PDF</h1><p>${message}</p></div></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return errorPage("Não autenticado.", 401);
  }

  const { id } = await params;
  const result = await getIncomingNFeXml(id);
  if ("error" in result) {
    return errorPage(result.error, 422);
  }

  try {
    const nfe = parseNFeCompleta(result.xml);
    const barcodeBase64 = await gerarBarcodeBase64(nfe.chaveAcesso);
    const buffer = await renderToBuffer(<NFePdfDocument nfe={nfe} barcodeBase64={barcodeBase64} />);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="NF-${nfe.numero ?? id}.pdf"`,
      },
    });
  } catch (error) {
    return errorPage(
      error instanceof Error ? error.message : "Não foi possível processar o XML desta nota.",
      500,
    );
  }
}
