import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getStockTransferByGrupoId } from "@/server/actions/estoque";
import { getObjectBase64 } from "@/lib/r2";
import { TransferenciaOsPdfDocument } from "@/server/services/pdf/transferencia-os-pdf";

export const runtime = "nodejs";

async function safeGetObjectBase64(key: string): Promise<string | null> {
  try {
    return await getObjectBase64(key);
  } catch {
    return null;
  }
}

async function getDefaultLogoBase64(origin: string): Promise<string | null> {
  try {
    const response = await fetch(`${origin}/brand/reis-logo-color.png`);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ grupoId: string }> }) {
  const { grupoId } = await params;
  const transfer = await getStockTransferByGrupoId(grupoId);
  if (!transfer) {
    return NextResponse.json({ error: "Transferência não encontrada." }, { status: 404 });
  }

  const company = await prisma.companySettings.findFirst();
  const origin = new URL(request.url).origin;
  const logoBase64 = company?.logoUrl ? await safeGetObjectBase64(company.logoUrl) : await getDefaultLogoBase64(origin);

  const buffer = await renderToBuffer(
    <TransferenciaOsPdfDocument transfer={transfer} company={company} logoBase64={logoBase64} origin={origin} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="OS-Transferencia-${transfer.numeroOS ?? grupoId}.pdf"`,
    },
  });
}
