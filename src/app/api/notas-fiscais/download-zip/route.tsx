import { NextResponse } from "next/server";
import JSZip from "jszip";
import { renderToBuffer } from "@react-pdf/renderer";
import bwipjs from "bwip-js/node";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentWorkAccess } from "@/server/actions/permissions";
import { getObjectBuffer } from "@/lib/r2";
import { parseNFeCompleta } from "@/lib/sefaz/parse-nfe-full";
import { NFePdfDocument } from "@/server/services/pdf/nfe-pdf";

export const runtime = "nodejs";

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dataInicio = url.searchParams.get("dataInicio");
  const dataFim = url.searchParams.get("dataFim");
  const formato = url.searchParams.get("formato");
  const workId = url.searchParams.get("workId") || undefined;
  if (!dataInicio || !dataFim) {
    return NextResponse.json({ error: "Informe o período (data início e data fim)." }, { status: 400 });
  }
  if (formato !== "pdf" && formato !== "xml") {
    return NextResponse.json({ error: "Formato inválido — escolha PDF ou XML." }, { status: 400 });
  }

  const workAccess = await getCurrentWorkAccess();
  if (workId && workAccess !== null && !workAccess.includes(workId)) {
    return NextResponse.json({ error: "Você não tem acesso a essa obra." }, { status: 403 });
  }
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  fim.setUTCHours(23, 59, 59, 999);

  const invoices = await prisma.invoice.findMany({
    where: {
      dataEmissao: { gte: inicio, lte: fim },
      workId: workId ?? (workAccess !== null ? { in: workAccess } : undefined),
    },
    include: { supplier: true, incomingNFe: { select: { xmlCompleto: true } } },
    orderBy: { dataEmissao: "asc" },
  });

  if (invoices.length === 0) {
    return NextResponse.json({ error: "Nenhuma nota fiscal encontrada nesse período." }, { status: 404 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let incluidas = 0;

  for (const invoice of invoices) {
    const baseName = sanitizeFilename(`NF-${invoice.numero || invoice.id}-${invoice.supplier.nome}`);
    let filename = `${baseName}.${formato}`;
    let suffix = 2;
    while (usedNames.has(filename)) {
      filename = `${baseName}-${suffix}.${formato}`;
      suffix += 1;
    }

    try {
      if (formato === "xml") {
        const xml = invoice.arquivoXmlUrl
          ? (await getObjectBuffer(invoice.arquivoXmlUrl)).toString("utf-8")
          : invoice.incomingNFe?.xmlCompleto;
        if (!xml) continue;
        zip.file(filename, xml);
      } else {
        let pdfBytes: Buffer | Uint8Array;
        if (invoice.arquivoUrl) {
          pdfBytes = await getObjectBuffer(invoice.arquivoUrl);
        } else if (invoice.incomingNFe?.xmlCompleto) {
          const nfe = parseNFeCompleta(invoice.incomingNFe.xmlCompleto);
          const barcodeBase64 = await gerarBarcodeBase64(nfe.chaveAcesso);
          pdfBytes = await renderToBuffer(<NFePdfDocument nfe={nfe} barcodeBase64={barcodeBase64} />);
        } else {
          continue;
        }
        zip.file(filename, pdfBytes);
      }
      usedNames.add(filename);
      incluidas += 1;
    } catch {
      // Nota com arquivo indisponível/corrompido — pula e segue com as demais.
      continue;
    }
  }

  if (incluidas === 0) {
    return NextResponse.json(
      { error: `Nenhuma nota fiscal do período tem arquivo ${formato.toUpperCase()} disponível.` },
      { status: 404 },
    );
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="notas-fiscais-${dataInicio}_a_${dataFim}-${formato}.zip"`,
    },
  });
}
