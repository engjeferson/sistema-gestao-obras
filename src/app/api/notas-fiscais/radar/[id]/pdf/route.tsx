import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { getIncomingNFeXml } from "@/server/actions/sefaz-radar";
import { parseNFeCompleta } from "@/lib/sefaz/parse-nfe-full";
import { NFePdfDocument } from "@/server/services/pdf/nfe-pdf";

export const runtime = "nodejs";

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
  const buffer = await renderToBuffer(<NFePdfDocument nfe={nfe} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="NF-${nfe.numero ?? id}.pdf"`,
    },
  });
}
