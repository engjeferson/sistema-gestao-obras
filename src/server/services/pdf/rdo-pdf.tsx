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

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { width: 90, height: 40, objectFit: "contain" },
  companyName: { fontSize: 12, fontWeight: 700 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: "#555", marginBottom: 12 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, borderBottom: "1 solid #ccc", paddingBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#555" },
  badge: {
    fontSize: 9,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: "#eee",
    borderRadius: 3,
    marginRight: 6,
  },
  activityBlock: { marginBottom: 8, paddingBottom: 8, borderBottom: "1 solid #eee" },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoBlock: { width: "31%" },
  photo: { width: "100%", height: 90, objectFit: "cover", borderRadius: 3 },
  photoCaption: { fontSize: 8, color: "#555", marginTop: 2 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#999", textAlign: "center" },
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{company?.nome ?? "Empresa de Construção"}</Text>
            {company?.endereco ? <Text style={styles.label}>{company.endereco}</Text> : null}
            {company?.telefone ? <Text style={styles.label}>{company.telefone}</Text> : null}
          </View>
          {logoBase64 ? <Image style={styles.logo} src={`data:image/png;base64,${logoBase64}`} /> : null}
        </View>

        <Text style={styles.title}>Relatório Diário de Obra — RDO #{rdo.numero}</Text>
        <Text style={styles.subtitle}>
          {rdo.work.nome} ({rdo.work.codigo}) · {formatDateBR(rdo.data)}
          {rdo.clima ? ` · Clima: ${rdo.clima}` : ""}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados da obra</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Endereço:</Text>
            <Text>{rdo.work.endereco ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Responsável pelo RDO:</Text>
            <Text>{rdo.responsavel.name}</Text>
          </View>
        </View>

        {rdo.workers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipe presente</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {rdo.workers.map((w) => (
                <Text key={w.id} style={styles.badge}>
                  {w.funcao}: {w.quantidade}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {rdo.activities.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Atividades executadas</Text>
            {rdo.activities.map((a) => (
              <View key={a.id} style={styles.activityBlock}>
                <Text style={{ fontWeight: 700 }}>
                  {a.planningTask.stage.nome} — {a.planningTask.nome}
                </Text>
                <Text>{a.descricaoServico}</Text>
                <Text style={styles.label}>
                  Percentual: {Number(a.percentualAnterior).toFixed(0)}% para {Number(a.percentualAtual).toFixed(0)}%
                </Text>
              </View>
            ))}
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
            {rdo.occurrences.map((o) => (
              <View key={o.id} style={styles.row}>
                <Text style={styles.badge}>{OCCURRENCE_LABELS[o.tipo]}</Text>
                <Text style={{ flex: 1 }}>{o.descricao}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {rdo.observacoesGerais ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações gerais</Text>
            <Text>{rdo.observacoesGerais}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Gerado em {formatDateBR(new Date())} pelo Sistema de Gestão de Obras
        </Text>
      </Page>
    </Document>
  );
}
