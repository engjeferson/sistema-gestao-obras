export const WORK_STATUS_LABELS: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em andamento",
  PARALISADA: "Paralisada",
  CONCLUIDA: "Concluída",
};

export const WORK_STATUS_BADGE: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  PLANEJAMENTO: "secondary",
  EM_ANDAMENTO: "success",
  PARALISADA: "warning",
  CONCLUIDA: "secondary",
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  VENCIDO: "Vencido",
};

export const TRANSACTION_STATUS_BADGE: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  PENDENTE: "warning",
  PAGO: "success",
  VENCIDO: "destructive",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  PAGAR: "A pagar",
  RECEBER: "A receber",
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CONTRATO_CLIENTE: "Contrato com cliente",
  EMPREITADA: "Empreitada",
  PRESTADOR_SERVICO: "Prestador de serviço",
  FORNECEDOR: "Fornecedor",
  ADITIVO: "Aditivo",
  OUTROS: "Outros",
};

export const PLANNING_STATUS_LABELS: Record<string, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ATRASADA: "Atrasada",
};

export const PLANNING_STATUS_BADGE: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  NAO_INICIADA: "secondary",
  EM_ANDAMENTO: "warning",
  CONCLUIDA: "success",
  ATRASADA: "destructive",
};

export const FINANCIAL_CATEGORY_PLACEHOLDER = "Selecione uma categoria";

export const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  ENGENHEIRO: "Engenheiro",
  FINANCEIRO: "Financeiro",
  OBRA: "Obra (campo)",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  BOLETO: "Boleto",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
  CHEQUE: "Cheque",
  OUTROS: "Outros",
};

export const COST_TYPE_LABELS: Record<string, string> = {
  MATERIAL: "Material",
  MAO_DE_OBRA: "Mão de obra",
  SERVICO_TERCEIRIZADO: "Serviço terceirizado",
  EQUIPAMENTO: "Equipamento",
  TRANSPORTE: "Transporte",
  OUTROS: "Outros",
};

export const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
  MATERIAIS: "Materiais",
  CONCRETO: "Concreto",
  ACO: "Aço",
  MADEIRA: "Madeira",
  ELETRICA: "Elétrica",
  HIDRAULICA: "Hidráulica",
  ESQUADRIAS: "Esquadrias",
  PINTURA: "Pintura",
  SERVICOS: "Serviços",
  LOCACAO: "Locação",
  TRANSPORTE: "Transporte",
  OUTROS: "Outros",
};

export const UNIT_LABELS: Record<string, string> = {
  UN: "un",
  KG: "kg",
  M: "m",
  M2: "m²",
  M3: "m³",
  SACO: "saco",
  CAIXA: "caixa",
  LITRO: "litro",
};

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDateBR(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}
