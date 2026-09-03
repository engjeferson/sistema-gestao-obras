import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { formatDateBR } from "@/lib/status-labels";
import type { getStockTransferByGrupoId } from "@/server/actions/estoque";
import type { CompanySettingsModel } from "@/generated/prisma/models";

const NAVY = "#0e1a2a";
const TEAL = "#22776e";

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Montserrat", color: "#1a1a1a" },
  headerBand: {
    backgroundColor: NAVY,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  companyName: { fontSize: 12, fontWeight: 700, color: "#ffffff" },
  companyMeta: { fontSize: 8, color: "#b7c2cf", marginTop: 2 },
  logo: { width: 90, height: 40, objectFit: "contain" },
  title: { fontSize: 18, fontWeight: 700, color: "#ffffff", marginTop: 10 },
  subtitle: { fontSize: 9, color: "#b7c2cf", marginTop: 2 },

  body: { paddingHorizontal: 32, paddingTop: 18, paddingBottom: 40 },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#f5f6f8",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  metaItem: { flexDirection: "column", minWidth: "40%" },
  metaLabel: { fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontWeight: 700, marginTop: 2 },

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
  colMaterial: { flex: 3 },
  colQtd: { flex: 1, textAlign: "right" },

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

type TransferWithRelations = NonNullable<Awaited<ReturnType<typeof getStockTransferByGrupoId>>>;

type Props = {
  transfer: TransferWithRelations;
  company: CompanySettingsModel | null;
  logoBase64: string | null;
  origin: string;
};

function localLabel(work: { nome: string; codigo: string } | null) {
  return work ? `${work.codigo} — ${work.nome}` : "Estoque Geral";
}

export function TransferenciaOsPdfDocument({ transfer, company, logoBase64, origin }: Props) {
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: `${origin}/fonts/montserrat/Montserrat-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/montserrat/Montserrat-Bold.ttf`, fontWeight: 700 },
    ],
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.companyName}>{company?.nome ?? "Empresa de Construção"}</Text>
            {company?.endereco ? <Text style={styles.companyMeta}>{company.endereco}</Text> : null}
            {company?.telefone ? <Text style={styles.companyMeta}>{company.telefone}</Text> : null}
            <Text style={styles.title}>OS de Transferência{transfer.numeroOS ? ` nº ${transfer.numeroOS}` : ""}</Text>
            <Text style={styles.subtitle}>{formatDateBR(transfer.data)}</Text>
          </View>
          {logoBase64 ? <Image style={styles.logo} src={`data:image/png;base64,${logoBase64}`} /> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Origem</Text>
              <Text style={styles.metaValue}>{localLabel(transfer.origemWork)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Destino</Text>
              <Text style={styles.metaValue}>{localLabel(transfer.destinoWork)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Responsável</Text>
              <Text style={styles.metaValue}>{transfer.createdBy.name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Motivo / observação</Text>
              <Text style={styles.metaValue}>{transfer.motivo ?? "—"}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Materiais transferidos</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colMaterial]}>Material</Text>
              <Text style={[styles.th, styles.colQtd]}>Quantidade</Text>
            </View>
            {transfer.itens.map((item, index) => (
              <View key={`${item.material.id}-${index}`} style={styles.tableRow}>
                <Text style={[styles.td, styles.colMaterial]}>{item.material.nome}</Text>
                <Text style={[styles.td, styles.colQtd]}>
                  {item.quantidade} {item.material.unidadePadrao ?? ""}
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
