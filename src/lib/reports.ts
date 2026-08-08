export type ReportTable = {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
};

export const REPORT_DEFINITIONS = [
  { slug: "orcamento-obra", label: "Orçamento da obra", scopedToWork: true, allowAll: false },
  { slug: "previsto-realizado", label: "Previsto x realizado", scopedToWork: true, allowAll: false },
  { slug: "custos-por-etapa", label: "Custos por etapa", scopedToWork: true, allowAll: false },
  { slug: "fisico-financeiro", label: "Físico x financeiro", scopedToWork: true, allowAll: false },
  { slug: "despesas-por-obra", label: "Despesas por obra", scopedToWork: false, allowAll: false },
  { slug: "despesas-por-fornecedor", label: "Despesas por fornecedor", scopedToWork: false, allowAll: false },
  { slug: "despesas-por-categoria", label: "Despesas por categoria", scopedToWork: false, allowAll: false },
  { slug: "notas-fiscais-por-obra", label: "Notas fiscais por obra", scopedToWork: true, allowAll: true },
  { slug: "contas-a-pagar-por-obra", label: "Contas a pagar por obra", scopedToWork: true, allowAll: true },
] as const;

export type ReportSlug = (typeof REPORT_DEFINITIONS)[number]["slug"];
