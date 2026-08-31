export type ReportTable = {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
  total?: Record<string, string>;
};

// `categoria` decide qual toggle de `ReportPermissions` controla a visibilidade do relatório:
// "financeiro" (despesas, contas a pagar, notas fiscais) vs. "operacional" (orçamento x realizado,
// custos/físico por etapa — acompanhamento de obra, não o financeiro da empresa).
export const REPORT_DEFINITIONS = [
  { slug: "orcamento-obra", label: "Orçamento da obra", scopedToWork: true, allowAll: false, categoria: "operacional" },
  {
    slug: "previsto-realizado",
    label: "Previsto x realizado",
    scopedToWork: true,
    allowAll: false,
    categoria: "operacional",
  },
  {
    slug: "custos-por-etapa",
    label: "Custos por etapa",
    scopedToWork: true,
    allowAll: false,
    categoria: "operacional",
  },
  {
    slug: "fisico-financeiro",
    label: "Físico x financeiro",
    scopedToWork: true,
    allowAll: false,
    categoria: "operacional",
  },
  { slug: "despesas-por-obra", label: "Despesas por obra", scopedToWork: false, allowAll: false, categoria: "financeiro" },
  {
    slug: "despesas-por-fornecedor",
    label: "Despesas por fornecedor",
    scopedToWork: false,
    allowAll: false,
    categoria: "financeiro",
  },
  {
    slug: "despesas-por-categoria",
    label: "Despesas por categoria",
    scopedToWork: false,
    allowAll: false,
    categoria: "financeiro",
  },
  {
    slug: "notas-fiscais-por-obra",
    label: "Notas fiscais por obra",
    scopedToWork: true,
    allowAll: true,
    categoria: "financeiro",
  },
  {
    slug: "contas-a-pagar-por-obra",
    label: "Contas a pagar por obra",
    scopedToWork: true,
    allowAll: true,
    categoria: "financeiro",
  },
] as const;

export type ReportSlug = (typeof REPORT_DEFINITIONS)[number]["slug"];
