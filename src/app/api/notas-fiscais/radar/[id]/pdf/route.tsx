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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const result = await getIncomingNFeXml(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const nfe = parseNFeCompleta(result.xml);
  const barcodeBase64 = await gerarBarcodeBase64(nfe.chaveAcesso);
  const buffer = await renderToBuffer(<NFePdfDocument nfe={nfe} barcodeBase64={barcodeBase64} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="NF-${nfe.numero ?? id}.pdf"`,
    },
  });
}
