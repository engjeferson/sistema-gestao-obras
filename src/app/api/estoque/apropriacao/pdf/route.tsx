import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getWork } from "@/server/actions/obras";
import { getStockAppropriationTree } from "@/server/actions/estoque";
import { getCurrentWorkAccess } from "@/server/actions/permissions";
import { canAccessWork } from "@/lib/work-access";
import { getObjectBase64 } from "@/lib/r2";
import { AppropriationReportPdfDocument } from "@/server/services/pdf/appropriation-report-pdf";

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const workId = url.searchParams.get("workId");
  const modo = url.searchParams.get("modo") === "completo" ? "completo" : "resumo";
  if (!workId) {
    return NextResponse.json({ error: "Informe a obra." }, { status: 400 });
  }

  const workAccess = await getCurrentWorkAccess();
  if (!canAccessWork(workAccess, workId)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const work = await getWork(workId);
  if (!work) {
    return NextResponse.json({ error: "Obra não encontrada." }, { status: 404 });
  }

  const nodes = await getStockAppropriationTree(workId);

  const company = await prisma.companySettings.findFirst();
  const origin = url.origin;
  const logoBase64 = company?.logoUrl ? await safeGetObjectBase64(company.logoUrl) : await getDefaultLogoBase64(origin);

  const buffer = await renderToBuffer(
    <AppropriationReportPdfDocument
      work={{ nome: work.nome, codigo: work.codigo }}
      nodes={nodes}
      modo={modo}
      company={company}
      logoBase64={logoBase64}
      origin={origin}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Apropriacao-${work.codigo}-${modo}.pdf"`,
    },
  });
}
