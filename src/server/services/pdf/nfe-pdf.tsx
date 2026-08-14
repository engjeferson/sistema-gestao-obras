import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";
import type { NFeCompleta } from "@/lib/sefaz/parse-nfe-full";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: "#555", marginBottom: 12 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6, borderBottom: "1 solid #ccc", paddingBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#555" },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  chaveBox: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 3,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 1,
  },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "1 solid #eee",
  },
  colNome: { flex: 3 },
  colSmall: { flex: 1, textAlign: "right" },
  totaisBox: { marginTop: 12, alignItems: "flex-end" },
  totalFinal: { fontSize: 12, fontWeight: 700, marginTop: 4 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#999", textAlign: "center" },
});

function enderecoLinha(endereco: NFeCompleta["emitente"]["endereco"]) {
  const partes = [
    endereco.logradouro && endereco.numero ? `${endereco.logradouro}, ${endereco.numero}` : endereco.logradouro,
    endereco.bairro,
    endereco.municipio && endereco.uf ? `${endereco.municipio}/${endereco.uf}` : endereco.municipio,
    endereco.cep,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : "—";
}

export function NFePdfDocument({ nfe }: { nfe: NFeCompleta }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Nota Fiscal Eletrônica {nfe.numero ? `nº ${nfe.numero}` : ""} {nfe.serie ? `— Série ${nfe.serie}` : ""}
        </Text>
        <Text style={styles.subtitle}>
          {nfe.dataEmissao ? `Emitida em ${formatDateBR(new Date(nfe.dataEmissao))}` : ""}
          {nfe.naturezaOperacao ? ` · ${nfe.naturezaOperacao}` : ""}
        </Text>

        {nfe.chaveAcesso ? <Text style={styles.chaveBox}>{nfe.chaveAcesso}</Text> : null}

        <View style={styles.twoCol}>
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionTitle}>Emitente</Text>
            <Text style={{ fontWeight: 700 }}>{nfe.emitente.nome ?? "—"}</Text>
            <Text style={styles.label}>CNPJ: {nfe.emitente.cnpj ?? "—"}</Text>
            {nfe.emitente.ie ? <Text style={styles.label}>IE: {nfe.emitente.ie}</Text> : null}
            <Text style={styles.label}>{enderecoLinha(nfe.emitente.endereco)}</Text>
          </View>
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionTitle}>Destinatário</Text>
            <Text style={{ fontWeight: 700 }}>{nfe.destinatario.nome ?? "—"}</Text>
            <Text style={styles.label}>CNPJ/CPF: {nfe.destinatario.cnpj ?? "—"}</Text>
            <Text style={styles.label}>{enderecoLinha(nfe.destinatario.endereco)}</Text>
          </View>
        </View>

        {nfe.protocolo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Autorização de uso</Text>
            <Text>
              Protocolo {nfe.protocolo}
              {nfe.dataAutorizacao ? ` — ${nfe.dataAutorizacao}` : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colNome}>Descrição</Text>
              <Text style={styles.colSmall}>Qtd.</Text>
              <Text style={styles.colSmall}>Un.</Text>
              <Text style={styles.colSmall}>Vl. unit.</Text>
              <Text style={styles.colSmall}>Vl. total</Text>
            </View>
            {nfe.itens.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colNome}>{item.nome ?? "—"}</Text>
                <Text style={styles.colSmall}>{item.quantidade}</Text>
                <Text style={styles.colSmall}>{item.unidade ?? "—"}</Text>
                <Text style={styles.colSmall}>{formatCurrencyBRL(item.valorUnitario)}</Text>
                <Text style={styles.colSmall}>{formatCurrencyBRL(item.valorTotal)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.totaisBox}>
          {nfe.valorProdutos !== null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Valor dos produtos: </Text>
              <Text>{formatCurrencyBRL(nfe.valorProdutos)}</Text>
            </View>
          ) : null}
          {nfe.valorFrete ? (
            <View style={styles.row}>
              <Text style={styles.label}>Frete: </Text>
              <Text>{formatCurrencyBRL(nfe.valorFrete)}</Text>
            </View>
          ) : null}
          {nfe.valorDesconto ? (
            <View style={styles.row}>
              <Text style={styles.label}>Desconto: </Text>
              <Text>-{formatCurrencyBRL(nfe.valorDesconto)}</Text>
            </View>
          ) : null}
          {nfe.valorTotal !== null ? (
            <Text style={styles.totalFinal}>Total: {formatCurrencyBRL(nfe.valorTotal)}</Text>
          ) : null}
        </View>

        <Text style={styles.footer}>
          Documento gerado a partir do XML da NF-e via Distribuição DFe (SEFAZ) — não substitui o DANFE oficial.
        </Text>
      </Page>
    </Document>
  );
}
