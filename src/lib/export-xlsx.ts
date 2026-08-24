import ExcelJS from "exceljs";
import type { ReportTable } from "@/lib/reports";

export async function buildXlsxBuffer(report: ReportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(report.title.slice(0, 31));

  sheet.columns = report.columns.map((column) => ({ header: column.label, key: column.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of report.rows) {
    sheet.addRow(row);
  }
  if (report.total) {
    sheet.addRow(report.total).font = { bold: true };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
