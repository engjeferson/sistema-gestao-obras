import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { formatDateBR, formatCurrencyBRL, UNIT_LABELS } from "@/lib/status-labels";
import type { AppropriationNode, AppropriationMaterial } from "@/server/actions/estoque";
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
  colMaterial: { flex: 2.2 },
  colCategoria: { flex: 1.3 },
  colQtd: { flex: 1.3 },
  colValor: { flex: 1, textAlign: "right" },

  nodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1 solid #e4e4e6",
    paddingVertical: 6,
    paddingRight: 8,
  },
  nodeNomeStage: { fontSize: 9, fontWeight: 700 },
  nodeNomeTask: { fontSize: 9, color: "#555" },
  nodeValores: { flexDirection: "column", alignItems: "flex-end" },
  nodeValor: { fontSize: 9, fontWeight: 700 },
  nodeMaoDeObra: { fontSize: 7.5, color: "#888" },
  materialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  materialNome: { fontSize: 8, color: "#777" },
  materialValor: { fontSize: 8, color: "#777" },

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

type Props = {
  work: { nome: string; codigo: string };
  nodes: AppropriationNode[];
  modo: "resumo" | "completo";
  company: CompanySettingsModel | null;
  logoBase64: string | null;
  origin: string;
};

function flattenMateriais(nodes: AppropriationNode[]): AppropriationMaterial[] {
  const byMaterial = new Map<string, AppropriationMaterial>();
  function walk(list: AppropriationNode[]) {
    for (const node of list) {
      for (const m of node.materiaisDiretos) {
        const existing = byMaterial.get(m.materialId) ?? { ...m, quantidade: 0, valor: 0 };
        existing.quantidade += m.quantidade;
        existing.valor += m.valor;
        byMaterial.set(m.materialId, existing);
      }
      walk(node.children);
    }
  }
  walk(nodes);
  return Array.from(byMaterial.values()).sort((a, b) => b.valor - a.valor);
}

function NodeRows({ nodes, depth }: { nodes: AppropriationNode[]; depth: number }) {
  return (
    <>
      {nodes.map((node) => (
        <View key={node.id}>
          <View style={[styles.nodeRow, { paddingLeft: 8 + depth * 14 }]} wrap={false}>
            <Text style={node.tipo === "stage" ? styles.nodeNomeStage : styles.nodeNomeTask}>
              {node.codigo ? `${node.codigo} — ` : ""}
              {node.nome}
            </Text>
            <View style={styles.nodeValores}>
              <Text style={styles.nodeValor}>{formatCurrencyBRL(node.valor)}</Text>
              {node.maoDeObra > 0 ? (
                <Text style={styles.nodeMaoDeObra}>Mão de obra: {formatCurrencyBRL(node.maoDeObra)}</Text>
              ) : null}
            </View>
          </View>
          {node.materiaisDiretos.map((m) => (
            <View key={m.materialId} style={[styles.materialRow, { paddingLeft: 24 + depth * 14 }]} wrap={false}>
              <Text style={styles.materialNome}>{m.nome}</Text>
              <Text style={styles.materialValor}>
                {m.quantidade} {UNIT_LABELS[m.unidade ?? ""] ?? m.unidade} · {formatCurrencyBRL(m.valor)}
              </Text>
            </View>
          ))}
          {node.children.length > 0 ? <NodeRows nodes={node.children} depth={depth + 1} /> : null}
        </View>
      ))}
    </>
  );
}

export function AppropriationReportPdfDocument({ work, nodes, modo, company, logoBase64, origin }: Props) {
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: `${origin}/fonts/montserrat/Montserrat-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/montserrat/Montserrat-Bold.ttf`, fontWeight: 700 },
    ],
  });

  const valorTotal = nodes.reduce((sum, node) => sum + node.valor, 0);
  const maoDeObraTotal = nodes.reduce((sum, node) => sum + node.maoDeObra, 0);
  const materiais = modo === "resumo" ? flattenMateriais(nodes) : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.companyName}>{company?.nome ?? "Empresa de Construção"}</Text>
            {company?.endereco ? <Text style={styles.companyMeta}>{company.endereco}</Text> : null}
            {company?.telefone ? <Text style={styles.companyMeta}>{company.telefone}</Text> : null}
            <Text style={styles.title}>Apropriação de material</Text>
            <Text style={styles.subtitle}>
              {work.codigo} — {work.nome} · {modo === "resumo" ? "Resumo por material" : "Detalhado por etapa e atividade"}
            </Text>
          </View>
          {logoBase64 ? <Image style={styles.logo} src={`data:image/png;base64,${logoBase64}`} /> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Valor total em material apropriado</Text>
              <Text style={styles.kpiValue}>{formatCurrencyBRL(valorTotal)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Valor total em mão de obra</Text>
              <Text style={styles.kpiValue}>{formatCurrencyBRL(maoDeObraTotal)}</Text>
            </View>
          </View>

          {modo === "resumo" ? (
            <>
              <Text style={styles.sectionTitle}>Materiais apropriados</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, styles.colMaterial]}>Material</Text>
                  <Text style={[styles.th, styles.colCategoria]}>Categoria</Text>
                  <Text style={[styles.th, styles.colQtd]}>Quantidade</Text>
                  <Text style={[styles.th, styles.colValor]}>Valor</Text>
                </View>
                {materiais.map((m) => (
                  <View key={m.materialId} style={styles.tableRow} wrap={false}>
                    <Text style={[styles.td, styles.colMaterial]}>{m.nome}</Text>
                    <Text style={[styles.td, styles.colCategoria]}>{m.categoria ?? "—"}</Text>
                    <Text style={[styles.td, styles.colQtd]}>
                      {m.quantidade} {UNIT_LABELS[m.unidade ?? ""] ?? m.unidade}
                    </Text>
                    <Text style={[styles.td, styles.colValor]}>{formatCurrencyBRL(m.valor)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Etapas, atividades e materiais</Text>
              <View style={styles.table}>
                <NodeRows nodes={nodes} depth={0} />
              </View>
            </>
          )}
        </View>

        <Text style={styles.footer} fixed>
          {company?.nome ?? "Empresa de Construção"} — Documento gerado em {formatDateBR(new Date())}
        </Text>
      </Page>
    </Document>
  );
}
