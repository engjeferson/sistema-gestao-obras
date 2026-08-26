import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { parsePlanilhaBulkRows } from "@/lib/planning-sheet-parser";

export const runtime = "nodejs";

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // Datas de célula Excel não têm fuso — ExcelJS já entrega meia-noite UTC do dia certo.
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    if ("text" in value) return String((value as { text: unknown }).text);
    if ("richText" in value) {
      return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    }
  }
  return String(value);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !["ADMINISTRADOR", "ENGENHEIRO"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo." }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o arquivo — envie um .xlsx válido." }, { status: 400 });
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return NextResponse.json({ error: "A planilha não tem nenhuma aba com dados." }, { status: 400 });
  }

  const lines: string[][] = [];
  worksheet.eachRow((row) => {
    const cols: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cols.push(cellToString(cell.value));
    });
    lines.push(cols);
  });

  const result = parsePlanilhaBulkRows(lines);
  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma linha reconhecida — confira se a planilha tem as colunas Item, Descrição, Data Início e Data Final." },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
