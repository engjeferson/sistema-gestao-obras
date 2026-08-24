// Constantes dos tipos de evento de Manifestação do Destinatário — separado
// de manifestacao.ts porque esse arquivo é server-only (usa fs/node-forge
// pra assinar XML) e não pode ser importado por componentes client.
export const TIPO_EVENTO_MANIFESTACAO = {
  CONFIRMACAO_OPERACAO: "210200",
  CIENCIA_OPERACAO: "210210",
  DESCONHECIMENTO_OPERACAO: "210220",
  OPERACAO_NAO_REALIZADA: "210240",
} as const;
