import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getContract } from "@/server/actions/contratos";
import { getCurrentWorkAccess, getCurrentContratosVisibility, getCurrentSensitiveValuesAccess } from "@/server/actions/permissions";
import { canAccessWork } from "@/lib/work-access";
import { getObjectBase64 } from "@/lib/r2";
import { ContractReportPdfDocument } from "@/server/services/pdf/contract-report-pdf";

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string; contractId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id, contractId } = await params;
  const [workAccess, verContratos] = await Promise.all([getCurrentWorkAccess(), getCurrentContratosVisibility()]);
  if (!verContratos || !canAccessWork(workAccess, id)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const contract = await getContract(contractId);
  if (!contract || contract.workId !== id) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  const canSeeValues = await getCurrentSensitiveValuesAccess();
  const company = await prisma.companySettings.findFirst();
  const origin = new URL(request.url).origin;
  const logoBase64 = company?.logoUrl ? await safeGetObjectBase64(company.logoUrl) : await getDefaultLogoBase64(origin);

  const buffer = await renderToBuffer(
    <ContractReportPdfDocument
      contract={contract}
      company={company}
      logoBase64={logoBase64}
      origin={origin}
      canSeeValues={canSeeValues}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Contrato-${contract.nome.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf"`,
    },
  });
}
