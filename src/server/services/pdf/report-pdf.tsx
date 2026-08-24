import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDateBR } from "@/lib/status-labels";
import type { ReportTable } from "@/lib/reports";
import type { CompanySettingsModel } from "@/generated/prisma/models";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { width: 90, height: 40, objectFit: "contain" },
  companyName: { fontSize: 12, fontWeight: 700 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: "#555", marginBottom: 12 },
  table: { display: "flex", width: "100%" },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #eee", paddingVertical: 4 },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1 solid #333", paddingVertical: 4 },
  tableTotalRow: { flexDirection: "row", borderTop: "1 solid #333", paddingVertical: 4 },
  tableCell: { flex: 1, paddingRight: 6 },
  tableHeaderCell: { flex: 1, paddingRight: 6, fontWeight: 700 },
  tableTotalCell: { flex: 1, paddingRight: 6, fontWeight: 700 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#999", textAlign: "center" },
});

export function ReportPdfDocument({
  report,
  company,
  logoBase64,
}: {
  report: ReportTable;
  company: CompanySettingsModel | null;
  logoBase64: string | null;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{company?.nome ?? "Empresa de Construção"}</Text>
          </View>
          {logoBase64 ? <Image style={styles.logo} src={`data:image/png;base64,${logoBase64}`} /> : null}
        </View>

        <Text style={styles.title}>{report.title}</Text>
        {report.subtitle ? <Text style={styles.subtitle}>{report.subtitle}</Text> : null}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            {report.columns.map((column) => (
              <Text key={column.key} style={styles.tableHeaderCell}>
                {column.label}
              </Text>
            ))}
          </View>
          {report.rows.length === 0 ? (
            <Text style={{ paddingVertical: 8, color: "#777" }}>Nenhum dado encontrado.</Text>
          ) : (
            report.rows.map((row, index) => (
              <View key={index} style={styles.tableRow}>
                {report.columns.map((column) => (
                  <Text key={column.key} style={styles.tableCell}>
                    {row[column.key] ?? ""}
                  </Text>
                ))}
              </View>
            ))
          )}
          {report.total ? (
            <View style={styles.tableTotalRow}>
              {report.columns.map((column) => (
                <Text key={column.key} style={styles.tableTotalCell}>
                  {report.total?.[column.key] ?? ""}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>Gerado em {formatDateBR(new Date())} pelo Sistema de Gestão de Obras</Text>
      </Page>
    </Document>
  );
}
