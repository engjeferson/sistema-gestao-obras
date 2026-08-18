import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";
import type { NFeCompleta, NFeEndereco } from "@/lib/sefaz/parse-nfe-full";

const BORDER = "0.75 solid #000";

const styles = StyleSheet.create({
  page: { padding: 16, fontSize: 7, fontFamily: "Helvetica", color: "#000" },

  box: { border: BORDER },
  boxRow: { flexDirection: "row" },
  headerRow: { flexDirection: "row", marginBottom: 4 },

  field: { padding: 3, flex: 1 },
  fieldLabel: { fontSize: 5.5, color: "#333", marginBottom: 1 },
  fieldValue: { fontSize: 7.5 },
  fieldValueBold: { fontSize: 7.5, fontWeight: 700 },

  emitBox: { flex: 2.3, border: BORDER, padding: 4, justifyContent: "center" },
  emitNome: { fontSize: 10, fontWeight: 700, marginBottom: 3 },
  emitLine: { fontSize: 7, color: "#222", marginBottom: 1 },

  danfeBox: { flex: 1.1, border: BORDER, borderLeft: "none", padding: 4, alignItems: "center" },
  danfeTitle: { fontSize: 16, fontWeight: 700 },
  danfeSubtitle: { fontSize: 6, textAlign: "center", marginTop: 2 },
  danfeTipo: { fontSize: 6, textAlign: "center", marginTop: 4 },
  danfeNumSerie: { fontSize: 8, fontWeight: 700, marginTop: 4, textAlign: "center" },

  chaveBox: { flex: 1.6, border: BORDER, borderLeft: "none", padding: 4, justifyContent: "center" },
  barcode: { width: "100%", height: 26 },
  chaveTexto: {
    fontFamily: "Courier",
    fontSize: 7,
    textAlign: "center",
    marginTop: 3,
    letterSpacing: 0.4,
  },
  chaveLegenda: { fontSize: 5, textAlign: "center", marginTop: 2, color: "#333" },

  sectionTitle: {
    fontSize: 6,
    fontWeight: 700,
    backgroundColor: "#eee",
    padding: 2,
    marginTop: 4,
    marginBottom: 0,
  },

  totaisGrid: { flexDirection: "row", flexWrap: "wrap" },
  totalCell: { width: "16.66%", border: BORDER, borderTop: "none", borderLeft: "none", padding: 3 },

  table: { border: BORDER, marginTop: 0 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#eee", borderBottom: BORDER },
  tableRow: { flexDirection: "row", borderBottom: "0.5 solid #ccc" },
  th: { fontSize: 5.5, fontWeight: 700, padding: 2, borderRight: "0.5 solid #999" },
  td: { fontSize: 6, padding: 2, borderRight: "0.5 solid #ccc" },
  tdRight: { fontSize: 6, padding: 2, borderRight: "0.5 solid #ccc", textAlign: "right" },

  colCodigo: { width: "6%" },
  colDescricao: { width: "22%" },
  colNcm: { width: "7%" },
  colCst: { width: "6%" },
  colCfop: { width: "6%" },
  colUn: { width: "5%" },
  colQtd: { width: "7%" },
  colVUnit: { width: "8%" },
  colVTotal: { width: "8%" },
  colBcIcms: { width: "8%" },
  colVIcms: { width: "7%" },
  colVIpi: { width: "6%" },
  colPIcms: { width: "5%" },
  colPIpi: { width: "5%", borderRight: "none" },

  footer: { position: "absolute", bottom: 10, left: 16, right: 16, fontSize: 5.5, color: "#666", textAlign: "center" },
});

function Field({
  label,
  value,
  style = {},
  bold,
}: {
  label: string;
  value: string;
  style?: Style;
  bold?: boolean;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={bold ? styles.fieldValueBold : styles.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function enderecoLinha(endereco: NFeEndereco) {
  const partes = [
    endereco.logradouro && endereco.numero ? `${endereco.logradouro}, ${endereco.numero}` : endereco.logradouro,
    endereco.complemento,
    endereco.bairro,
    endereco.municipio && endereco.uf ? `${endereco.municipio}/${endereco.uf}` : endereco.municipio,
    endereco.cep,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : "—";
}

function formatChave(chave: string | null) {
  if (!chave) return "—";
  return chave.match(/.{1,4}/g)?.join(" ") ?? chave;
}

const MOD_FRETE_LABELS: Record<string, string> = {
  "0": "0 — Contratação por conta do Remetente (CIF)",
  "1": "1 — Contratação por conta do Destinatário (FOB)",
  "2": "2 — Contratação por conta de Terceiros",
  "3": "3 — Transporte Próprio por conta do Remetente",
  "4": "4 — Transporte Próprio por conta do Destinatário",
  "9": "9 — Sem transporte",
};

export function NFePdfDocument({ nfe, barcodeBase64 }: { nfe: NFeCompleta; barcodeBase64: string | null }) {
  const temTransporte =
    nfe.transporte &&
    (nfe.transporte.transportadorNome || nfe.transporte.modalidadeFrete || nfe.transporte.volumes);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.emitBox}>
            <Text style={styles.emitNome}>{nfe.emitente.nome ?? "—"}</Text>
            <Text style={styles.emitLine}>{enderecoLinha(nfe.emitente.endereco)}</Text>
            <Text style={styles.emitLine}>
              CNPJ: {nfe.emitente.cnpj ?? "—"}
              {nfe.emitente.ie ? `   IE: ${nfe.emitente.ie}` : ""}
              {nfe.emitente.fone ? `   Fone: ${nfe.emitente.fone}` : ""}
            </Text>
          </View>
          <View style={styles.danfeBox}>
            <Text style={styles.danfeTitle}>DANFE</Text>
            <Text style={styles.danfeSubtitle}>Documento Auxiliar da{"\n"}Nota Fiscal Eletrônica</Text>
            <Text style={styles.danfeTipo}>
              {nfe.tipoOperacao === "0" ? "0 — ENTRADA" : nfe.tipoOperacao === "1" ? "1 — SAÍDA" : "0/1 — Entrada/Saída"}
            </Text>
            <Text style={styles.danfeNumSerie}>
              Nº {nfe.numero ?? "—"}{"\n"}Série {nfe.serie ?? "—"}
            </Text>
          </View>
          <View style={styles.chaveBox}>
            {barcodeBase64 ? (
              <Image style={styles.barcode} src={`data:image/png;base64,${barcodeBase64}`} />
            ) : null}
            <Text style={styles.chaveTexto}>{formatChave(nfe.chaveAcesso)}</Text>
            <Text style={styles.chaveLegenda}>
              Consulta de autenticidade no portal nacional da NF-e, pela Chave de Acesso, em
              www.nfe.fazenda.gov.br
            </Text>
          </View>
        </View>

        <View style={styles.box}>
          <View style={styles.boxRow}>
            <Field label="NATUREZA DA OPERAÇÃO" value={nfe.naturezaOperacao ?? "—"} style={{ flex: 2, borderRight: "0.5 solid #999" }} />
            <Field
              label="PROTOCOLO DE AUTORIZAÇÃO DE USO"
              value={nfe.protocolo ? `${nfe.protocolo}${nfe.dataAutorizacao ? ` — ${nfe.dataAutorizacao}` : ""}` : "—"}
              style={{ flex: 2 }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>DESTINATÁRIO / REMETENTE</Text>
        <View style={styles.box}>
          <View style={styles.boxRow}>
            <Field label="NOME/RAZÃO SOCIAL" value={nfe.destinatario.nome ?? "—"} style={{ flex: 2.5, borderRight: "0.5 solid #999" }} />
            <Field label="CNPJ/CPF" value={nfe.destinatario.cnpj ?? "—"} style={{ flex: 1, borderRight: "0.5 solid #999" }} />
            <Field label="DATA DE EMISSÃO" value={nfe.dataEmissao ? formatDateBR(new Date(`${nfe.dataEmissao}T00:00:00`)) : "—"} style={{ flex: 1 }} />
          </View>
          <View style={[styles.boxRow, { borderTop: "0.5 solid #999" }]}>
            <Field label="ENDEREÇO" value={enderecoLinha(nfe.destinatario.endereco)} style={{ flex: 2.5, borderRight: "0.5 solid #999" }} />
            <Field label="IE" value={nfe.destinatario.ie ?? "—"} style={{ flex: 1, borderRight: "0.5 solid #999" }} />
            <Field label="DATA SAÍDA/ENTRADA" value={nfe.dataSaidaEntrada ? formatDateBR(new Date(`${nfe.dataSaidaEntrada}T00:00:00`)) : "—"} style={{ flex: 1 }} />
          </View>
        </View>

        {nfe.duplicatas.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>FATURA / DUPLICATAS</Text>
            <View style={styles.boxRow}>
              {nfe.duplicatas.map((dup, index) => (
                <View key={index} style={{ flex: 1, border: BORDER, borderLeft: index === 0 ? BORDER : "none", padding: 3 }}>
                  <Text style={styles.fieldLabel}>PARCELA {dup.numero ?? index + 1}</Text>
                  <Text style={styles.fieldValue}>
                    {dup.vencimento ? formatDateBR(new Date(`${dup.vencimento}T00:00:00`)) : "—"} — {formatCurrencyBRL(dup.valor)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>CÁLCULO DO IMPOSTO</Text>
        <View style={styles.totaisGrid}>
          <Field label="BASE CÁLC. ICMS" value={nfe.valorBaseCalculoIcms !== null ? formatCurrencyBRL(nfe.valorBaseCalculoIcms) : "—"} style={styles.totalCell} />
          <Field label="VALOR ICMS" value={nfe.valorIcms !== null ? formatCurrencyBRL(nfe.valorIcms) : "—"} style={styles.totalCell} />
          <Field label="BASE CÁLC. ICMS ST" value={nfe.valorBaseCalculoIcmsSt !== null ? formatCurrencyBRL(nfe.valorBaseCalculoIcmsSt) : "—"} style={styles.totalCell} />
          <Field label="VALOR ICMS ST" value={nfe.valorIcmsSt !== null ? formatCurrencyBRL(nfe.valorIcmsSt) : "—"} style={styles.totalCell} />
          <Field label="VALOR IPI" value={nfe.valorIpi !== null ? formatCurrencyBRL(nfe.valorIpi) : "—"} style={styles.totalCell} />
          <Field label="VALOR PRODUTOS" value={nfe.valorProdutos !== null ? formatCurrencyBRL(nfe.valorProdutos) : "—"} style={{ ...styles.totalCell, borderRight: BORDER }} />
          <Field label="VALOR FRETE" value={nfe.valorFrete !== null ? formatCurrencyBRL(nfe.valorFrete) : "—"} style={styles.totalCell} />
          <Field label="VALOR SEGURO" value={nfe.valorSeguro !== null ? formatCurrencyBRL(nfe.valorSeguro) : "—"} style={styles.totalCell} />
          <Field label="DESCONTO" value={nfe.valorDesconto !== null ? formatCurrencyBRL(nfe.valorDesconto) : "—"} style={styles.totalCell} />
          <Field label="OUTRAS DESPESAS" value={nfe.valorOutrasDespesas !== null ? formatCurrencyBRL(nfe.valorOutrasDespesas) : "—"} style={styles.totalCell} />
          <Field label="VALOR APROX. TRIBUTOS" value={nfe.valorTotalTributos !== null ? formatCurrencyBRL(nfe.valorTotalTributos) : "—"} style={styles.totalCell} />
          <Field
            label="VALOR TOTAL DA NOTA"
            value={nfe.valorTotal !== null ? formatCurrencyBRL(nfe.valorTotal) : "—"}
            bold
            style={{ ...styles.totalCell, borderRight: BORDER }}
          />
        </View>

        {temTransporte ? (
          <>
            <Text style={styles.sectionTitle}>TRANSPORTADOR / VOLUMES TRANSPORTADOS</Text>
            <View style={styles.box}>
              <View style={styles.boxRow}>
                <Field label="NOME/RAZÃO SOCIAL" value={nfe.transporte?.transportadorNome ?? "—"} style={{ flex: 2, borderRight: "0.5 solid #999" }} />
                <Field label="FRETE POR CONTA" value={MOD_FRETE_LABELS[nfe.transporte?.modalidadeFrete ?? ""] ?? "—"} style={{ flex: 2, borderRight: "0.5 solid #999" }} />
                <Field label="PLACA / UF" value={nfe.transporte?.veiculoPlaca ? `${nfe.transporte.veiculoPlaca} / ${nfe.transporte.veiculoUf ?? "—"}` : "—"} style={{ flex: 1 }} />
              </View>
              {nfe.transporte?.volumes ? (
                <View style={[styles.boxRow, { borderTop: "0.5 solid #999" }]}>
                  <Field label="QUANTIDADE" value={nfe.transporte.volumes.quantidade ?? "—"} style={{ flex: 1, borderRight: "0.5 solid #999" }} />
                  <Field label="ESPÉCIE" value={nfe.transporte.volumes.especie ?? "—"} style={{ flex: 1, borderRight: "0.5 solid #999" }} />
                  <Field label="MARCA" value={nfe.transporte.volumes.marca ?? "—"} style={{ flex: 1, borderRight: "0.5 solid #999" }} />
                  <Field label="NUMERAÇÃO" value={nfe.transporte.volumes.numeracao ?? "—"} style={{ flex: 1, borderRight: "0.5 solid #999" }} />
                  <Field label="PESO LÍQUIDO" value={nfe.transporte.volumes.pesoLiquido ?? "—"} style={{ flex: 1, borderRight: "0.5 solid #999" }} />
                  <Field label="PESO BRUTO" value={nfe.transporte.volumes.pesoBruto ?? "—"} style={{ flex: 1 }} />
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>DADOS DOS PRODUTOS / SERVIÇOS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colCodigo]}>Código</Text>
            <Text style={[styles.th, styles.colDescricao]}>Descrição</Text>
            <Text style={[styles.th, styles.colNcm]}>NCM</Text>
            <Text style={[styles.th, styles.colCst]}>CST</Text>
            <Text style={[styles.th, styles.colCfop]}>CFOP</Text>
            <Text style={[styles.th, styles.colUn]}>Un.</Text>
            <Text style={[styles.th, styles.colQtd]}>Qtd.</Text>
            <Text style={[styles.th, styles.colVUnit]}>Vl. Unit.</Text>
            <Text style={[styles.th, styles.colVTotal]}>Vl. Total</Text>
            <Text style={[styles.th, styles.colBcIcms]}>BC ICMS</Text>
            <Text style={[styles.th, styles.colVIcms]}>Vl. ICMS</Text>
            <Text style={[styles.th, styles.colVIpi]}>Vl. IPI</Text>
            <Text style={[styles.th, styles.colPIcms]}>% ICMS</Text>
            <Text style={[styles.th, styles.colPIpi]}>% IPI</Text>
          </View>
          {nfe.itens.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.td, styles.colCodigo]}>{item.codigo ?? "—"}</Text>
              <Text style={[styles.td, styles.colDescricao]}>{item.nome ?? "—"}</Text>
              <Text style={[styles.td, styles.colNcm]}>{item.ncm ?? "—"}</Text>
              <Text style={[styles.td, styles.colCst]}>{item.cstIcms ?? "—"}</Text>
              <Text style={[styles.td, styles.colCfop]}>{item.cfop ?? "—"}</Text>
              <Text style={[styles.td, styles.colUn]}>{item.unidade ?? "—"}</Text>
              <Text style={[styles.tdRight, styles.colQtd]}>{item.quantidade}</Text>
              <Text style={[styles.tdRight, styles.colVUnit]}>{formatCurrencyBRL(item.valorUnitario)}</Text>
              <Text style={[styles.tdRight, styles.colVTotal]}>{formatCurrencyBRL(item.valorTotal)}</Text>
              <Text style={[styles.tdRight, styles.colBcIcms]}>
                {item.baseCalculoIcms !== null ? formatCurrencyBRL(item.baseCalculoIcms) : "—"}
              </Text>
              <Text style={[styles.tdRight, styles.colVIcms]}>{item.valorIcms !== null ? formatCurrencyBRL(item.valorIcms) : "—"}</Text>
              <Text style={[styles.tdRight, styles.colVIpi]}>{item.valorIpi !== null ? formatCurrencyBRL(item.valorIpi) : "—"}</Text>
              <Text style={[styles.tdRight, styles.colPIcms]}>{item.aliquotaIcms !== null ? `${item.aliquotaIcms}%` : "—"}</Text>
              <Text style={[styles.tdRight, styles.colPIpi]}>{item.aliquotaIpi !== null ? `${item.aliquotaIpi}%` : "—"}</Text>
            </View>
          ))}
        </View>

        {nfe.informacoesComplementares ? (
          <>
            <Text style={styles.sectionTitle}>DADOS ADICIONAIS</Text>
            <View style={[styles.box, { padding: 4 }]}>
              <Text style={styles.fieldLabel}>INFORMAÇÕES COMPLEMENTARES</Text>
              <Text style={styles.fieldValue}>{nfe.informacoesComplementares}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.footer}>
          DANFE gerado a partir do XML da NF-e obtido via Distribuição DFe (SEFAZ).
        </Text>
      </Page>
    </Document>
  );
}
