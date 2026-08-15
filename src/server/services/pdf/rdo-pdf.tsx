import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDateBR } from "@/lib/status-labels";
import type { getRdo } from "@/server/actions/rdo";
import type { CompanySettingsModel } from "@/generated/prisma/models";

const OCCURRENCE_LABELS: Record<string, string> = {
  PROBLEMA: "Problema",
  ATRASO: "Atraso",
  FALTA_MATERIAL: "Falta de material",
  ALTERACAO: "Alteração",
  VISITA: "Visita",
  OBSERVACAO: "Observação",
};

const OCCURRENCE_COLORS: Record<string, { bg: string; fg: string }> = {
  PROBLEMA: { bg: "#fce8e8", fg: "#b3261e" },
  ATRASO: { bg: "#fdf0e0", fg: "#b26a00" },
  FALTA_MATERIAL: { bg: "#fdf0e0", fg: "#b26a00" },
  ALTERACAO: { bg: "#e8eef7", fg: "#2f4f8f" },
  VISITA: { bg: "#e2f5f3", fg: "#22776e" },
  OBSERVACAO: { bg: "#f0f0f0", fg: "#555555" },
};

const NAVY = "#0e1a2a";
const TEAL = "#22776e";
const TEAL_LIGHT = "#e2f5f3";

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
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
    justifyContent: "space-between",
    backgroundColor: "#f5f6f8",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  metaItem: { flexDirection: "column" },
  metaLabel: { fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontWeight: 700, marginTop: 2 },
  climaBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: TEAL,
    backgroundColor: TEAL_LIGHT,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#555" },

  workerBadge: {
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  },

  activityCard: {
    backgroundColor: "#f9f9fa",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  activityHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activityStage: { fontSize: 8, color: "#888", textTransform: "uppercase", letterSpacing: 0.4 },
  activityName: { fontSize: 10, fontWeight: 700, marginTop: 1 },
  activityDesc: { fontSize: 9, color: "#444", marginTop: 4, marginBottom: 8 },
  progressTrack: { height: 6, backgroundColor: "#e4e4e6", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: TEAL, borderRadius: 3 },
  progressLabel: { fontSize: 8, color: "#888", marginTop: 4 },
  percentBadge: { fontSize: 10, fontWeight: 700, color: TEAL },

  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoBlock: { width: "31%" },
  photo: { width: "100%", height: 100, objectFit: "cover", borderRadius: 6 },
  photoCaption: { fontSize: 8, color: "#555", marginTop: 3 },

  occurrenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  occurrenceBadge: { fontSize: 8, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 10 },
  occurrenceText: { flex: 1, fontSize: 9 },

  observations: { fontSize: 9, lineHeight: 1.5, color: "#333" },

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

type RdoWithRelations = NonNullable<Awaited<ReturnType<typeof getRdo>>>;

type Props = {
  rdo: RdoWithRelations;
  company: CompanySettingsModel | null;
  logoBase64: string | null;
  photosBase64: { url: string; base64: string; descricao: string | null }[];
};

export function RdoPdfDocument({ rdo, company, logoBase64, photosBase64 }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.companyName}>{company?.nome ?? "Empresa de Construção"}</Text>
            {company?.endereco ? <Text style={styles.companyMeta}>{company.endereco}</Text> : null}
            {company?.telefone ? <Text style={styles.companyMeta}>{company.telefone}</Text> : null}
            <Text style={styles.title}>RDO nº {rdo.numero}</Text>
            <Text style={styles.subtitle}>
              {rdo.work.nome} ({rdo.work.codigo}) · {formatDateBR(rdo.data)}
            </Text>
          </View>
          {logoBase64 ? <Image style={styles.logo} src={`data:image/png;base64,${logoBase64}`} /> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Endereço</Text>
              <Text style={styles.metaValue}>{rdo.work.endereco ?? "—"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Responsável</Text>
              <Text style={styles.metaValue}>{rdo.responsavel.name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Clima</Text>
              {rdo.clima ? <Text style={styles.climaBadge}>{rdo.clima}</Text> : <Text>—</Text>}
            </View>
          </View>

          {rdo.workers.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipe presente</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {rdo.workers.map((w) => (
                  <Text key={w.id} style={styles.workerBadge}>
                    {w.funcao}: {w.quantidade}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          {rdo.activities.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Atividades executadas</Text>
              {rdo.activities.map((a) => {
                const atual = Number(a.percentualAtual);
                const anterior = Number(a.percentualAnterior);
                return (
                  <View key={a.id} style={styles.activityCard}>
                    <View style={styles.activityHeaderRow}>
                      <View>
                        <Text style={styles.activityStage}>{a.planningTask.stage.nome}</Text>
                        <Text style={styles.activityName}>{a.planningTask.nome}</Text>
                      </View>
                      <Text style={styles.percentBadge}>{atual.toFixed(0)}%</Text>
                    </View>
                    {a.descricaoServico ? <Text style={styles.activityDesc}>{a.descricaoServico}</Text> : null}
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, atual))}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                      {anterior.toFixed(0)}% → {atual.toFixed(0)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {photosBase64.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fotos</Text>
              <View style={styles.photosGrid}>
                {photosBase64.map((photo, index) => (
                  <View key={index} style={styles.photoBlock}>
                    <Image style={styles.photo} src={`data:image/jpeg;base64,${photo.base64}`} />
                    {photo.descricao ? <Text style={styles.photoCaption}>{photo.descricao}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {rdo.occurrences.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ocorrências</Text>
              {rdo.occurrences.map((o) => {
                const colors = OCCURRENCE_COLORS[o.tipo] ?? OCCURRENCE_COLORS.OBSERVACAO;
                return (
                  <View key={o.id} style={styles.occurrenceRow}>
                    <Text style={[styles.occurrenceBadge, { backgroundColor: colors.bg, color: colors.fg }]}>
                      {OCCURRENCE_LABELS[o.tipo]}
                    </Text>
                    <Text style={styles.occurrenceText}>{o.descricao}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {rdo.observacoesGerais ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Observações gerais</Text>
              <Text style={styles.observations}>{rdo.observacoesGerais}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>Gerado em {formatDateBR(new Date())} pelo Sistema de Gestão de Obras</Text>
      </Page>
    </Document>
  );
}
