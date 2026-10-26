import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { formatDateBR, formatCurrencyOrHidden, CONTRACT_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from "@/lib/status-labels";
import type { getContract } from "@/server/actions/contratos";
import type { CompanySettingsModel } from "@/generated/prisma/models";

const NAVY = "#0e1a2a";
const TEAL = "#22776e";

const styles = StyleSheet.create({
  // paddingTop/paddingBottom vão direto no Page (não num View interno) — é a única forma do
  // react-pdf reservar essa margem em TODA página gerada pela paginação automática; um View só
  // aplica esse padding uma vez (início/fim do fluxo todo), então um contrato com muitas medições
  // acabava com conteúdo colado na borda de cima das páginas seguintes e invadindo o rodapé fixo.
  page: { fontSize: 10, fontFamily: "Montserrat", color: "#1a1a1a", paddingTop: 24, paddingBottom: 56 },
  headerBand: {
    backgroundColor: NAVY,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 32,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  companyName: { fontSize: 12, fontWeight: 700, color: "#ffffff" },
  companyMeta: { fontSize: 8, color: "#b7c2cf", marginTop: 2 },
  logo: { width: 90, height: 40, objectFit: "contain" },
  title: { fontSize: 18, fontWeight: 700, color: "#ffffff", marginTop: 10 },
  subtitle: { fontSize: 9, color: "#b7c2cf", marginTop: 2 },

  body: { paddingHorizontal: 32 },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#f5f6f8",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  metaItem: { flexDirection: "column", minWidth: "40%" },
  metaLabel: { fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontWeight: 700, marginTop: 2 },

  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: "#f5f6f8", borderRadius: 6, padding: 10 },
  kpiLabel: { fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 12, fontWeight: 700, marginTop: 4, color: NAVY },

  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  table: { borderRadius: 6, border: "1 solid #e4e4e6", overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f5f6f8" },
  tableRow: { flexDirection: "row", borderTop: "1 solid #e4e4e6" },
  th: { fontSize: 8, fontWeight: 700, color: "#555", padding: 8, textTransform: "uppercase" },
  td: { fontSize: 9, padding: 8 },
  colNumero: { flex: 0.6 },
  colData: { flex: 1 },
  colDescricao: { flex: 2.4 },
  colVencimento: { flex: 1 },
  colValor: { flex: 1, textAlign: "right" },
  colStatus: { flex: 1 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 7.5,
    color: "#999",
    textAlign: "center",
    borderTop: "1 solid #eee",
    paddingTop: 8,
  },
});

type ContractWithRelations = NonNullable<Awaited<ReturnType<typeof getContract>>>;

type Props = {
  contract: ContractWithRelations;
  company: CompanySettingsModel | null;
  logoBase64: string | null;
  origin: string;
  canSeeValues: boolean;
};

export function ContractReportPdfDocument({ contract, company, logoBase64, origin, canSeeValues }: Props) {
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: `${origin}/fonts/montserrat/Montserrat-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/montserrat/Montserrat-Bold.ttf`, fontWeight: 700 },
    ],
  });

  const valorPago = contract.measurements.reduce((sum, m) => {
    const paid = m.financialTransaction?.status === "PAGO" ? Number(m.financialTransaction.valor) : 0;
    return sum + paid;
  }, 0);
  const valorAditivos = contract.addendums.reduce((sum, a) => sum + Number(a.valor), 0);
  const valorBase = contract.valor !== null ? Number(contract.valor) : null;
  const valorTotal = valorBase !== null ? valorBase + valorAditivos : null;
  const saldo = valorTotal !== null ? valorTotal - valorPago : null;
  const percentual = valorTotal !== null && valorTotal > 0 ? (valorPago / valorTotal) * 100 : 0;
  const isDespesa = contract.direcao === "PAGAR";

  const measurements = [...contract.measurements].sort((a, b) => a.numero - b.numero);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.companyName}>{company?.nome ?? "Empresa de Construção"}</Text>
            {company?.endereco ? <Text style={styles.companyMeta}>{company.endereco}</Text> : null}
            {company?.telefone ? <Text style={styles.companyMeta}>{company.telefone}</Text> : null}
            <Text style={styles.title}>Relatório do contrato</Text>
            <Text style={styles.subtitle}>
              {contract.nome} — {formatDateBR(contract.data)}
            </Text>
          </View>
          {logoBase64 ? <Image style={styles.logo} src={`data:image/png;base64,${logoBase64}`} /> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Tipo</Text>
              <Text style={styles.metaValue}>{CONTRACT_TYPE_LABELS[contract.tipo]}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Direção</Text>
              <Text style={styles.metaValue}>{isDespesa ? "Despesa" : "Receita"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Contratante</Text>
              <Text style={styles.metaValue}>{contract.contratante}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Contratado</Text>
              <Text style={styles.metaValue}>{contract.contratado}</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Valor total</Text>
              <Text style={styles.kpiValue}>
                {valorTotal !== null ? formatCurrencyOrHidden(valorTotal, canSeeValues) : "—"}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{isDespesa ? "Pago" : "Recebido"}</Text>
              <Text style={styles.kpiValue}>{formatCurrencyOrHidden(valorPago, canSeeValues)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Saldo {isDespesa ? "a pagar" : "a receber"}</Text>
              <Text style={styles.kpiValue}>{saldo !== null ? formatCurrencyOrHidden(saldo, canSeeValues) : "—"}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Progresso</Text>
              <Text style={styles.kpiValue}>{percentual.toFixed(2)}%</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Medições</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colNumero]}>Nº</Text>
              <Text style={[styles.th, styles.colData]}>Data</Text>
              <Text style={[styles.th, styles.colDescricao]}>Descrição</Text>
              <Text style={[styles.th, styles.colVencimento]}>Vencimento</Text>
              <Text style={[styles.th, styles.colValor]}>Valor</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
            </View>
            {measurements.map((m) => (
              <View key={m.id} style={styles.tableRow} wrap={false}>
                <Text style={[styles.td, styles.colNumero]}>#{m.numero}</Text>
                <Text style={[styles.td, styles.colData]}>{formatDateBR(m.data)}</Text>
                <Text style={[styles.td, styles.colDescricao]}>{m.descricao || "—"}</Text>
                <Text style={[styles.td, styles.colVencimento]}>
                  {m.financialTransaction?.dataVencimento ? formatDateBR(m.financialTransaction.dataVencimento) : "—"}
                </Text>
                <Text style={[styles.td, styles.colValor]}>{formatCurrencyOrHidden(Number(m.valor), canSeeValues)}</Text>
                <Text style={[styles.td, styles.colStatus]}>
                  {m.financialTransaction ? TRANSACTION_STATUS_LABELS[m.financialTransaction.status] ?? "—" : "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {company?.nome ?? "Empresa de Construção"} — Documento gerado em {formatDateBR(new Date())}
        </Text>
      </Page>
    </Document>
  );
}
