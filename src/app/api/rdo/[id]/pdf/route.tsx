import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getRdo } from "@/server/actions/rdo";
import { getObjectBase64 } from "@/lib/r2";
import { RdoPdfDocument } from "@/server/services/pdf/rdo-pdf";

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rdo = await getRdo(id);
  if (!rdo) {
    return NextResponse.json({ error: "RDO não encontrado." }, { status: 404 });
  }

  const company = await prisma.companySettings.findFirst();
  const origin = new URL(request.url).origin;

  const [logoBase64, photosBase64] = await Promise.all([
    company?.logoUrl ? safeGetObjectBase64(company.logoUrl) : getDefaultLogoBase64(origin),
    Promise.all(
      rdo.photos.map(async (photo) => {
        const base64 = await safeGetObjectBase64(photo.url);
        return base64 ? { url: photo.url, base64, descricao: photo.descricao } : null;
      }),
    ),
  ]);

  const buffer = await renderToBuffer(
    <RdoPdfDocument
      rdo={rdo}
      company={company}
      logoBase64={logoBase64}
      photosBase64={photosBase64.filter((p): p is NonNullable<typeof p> => p !== null)}
      origin={origin}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="RDO-${rdo.numero}-${rdo.work.codigo}.pdf"`,
    },
  });
}
