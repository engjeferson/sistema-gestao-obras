export function sumBudgetItems(items: { valorTotalPrevisto: number }[]) {
  return items.reduce((sum, item) => sum + item.valorTotalPrevisto, 0);
}

export function computeMargemPrevista({ contrato, orcado }: { contrato: number; orcado: number }) {
  const lucroPrevisto = contrato - orcado;
  const margemPrevista = contrato > 0 ? (lucroPrevisto / contrato) * 100 : 0;
  return { lucroPrevisto, margemPrevista };
}

export function computeCustoPorM2({ orcado, areaConstruida }: { orcado: number; areaConstruida: number | null }) {
  if (!areaConstruida || areaConstruida <= 0) return null;
  return orcado / areaConstruida;
}

export function computeProjetado({ realizado, aPagar }: { realizado: number; aPagar: number }) {
  return realizado + aPagar;
}

export function computeSaldo({ orcado, projetado }: { orcado: number; projetado: number }) {
  return orcado - projetado;
}

export function computeAvancoFinanceiroPercent({ comprometido, orcado }: { comprometido: number; orcado: number }) {
  if (orcado <= 0) return 0;
  return (comprometido / orcado) * 100;
}

export type FisicoFinanceiroStatus = "ATENCAO" | "DENTRO_DO_ESPERADO";

export function computeFisicoFinanceiroStatus({ fisico, financeiro }: { fisico: number; financeiro: number }) {
  const diferenca = financeiro - fisico;
  const status: FisicoFinanceiroStatus = diferenca > 15 ? "ATENCAO" : "DENTRO_DO_ESPERADO";
  return { diferenca, status };
}

export function computeCustoFinalEstimado(stages: { orcado: number; comprometido: number }[]) {
  return stages.reduce((sum, s) => sum + Math.max(s.orcado, s.comprometido), 0);
}

export function computeMargemProjetada({ contrato, custoFinalEstimado }: { contrato: number; custoFinalEstimado: number }) {
  if (contrato <= 0) return 0;
  return ((contrato - custoFinalEstimado) / contrato) * 100;
}

export type MargemIndicador = "MELHOROU" | "ESTAVEL" | "PIOROU";

export function computeMargemIndicador(diferenca: number): MargemIndicador {
  if (diferenca > 2) return "MELHOROU";
  if (diferenca < -2) return "PIOROU";
  return "ESTAVEL";
}

export type BudgetAlert = { tipo: "warning" | "danger"; mensagem: string };

export function buildStageAlerts(
  stages: {
    nome: string;
    orcado: number;
    realizado: number;
    aPagar: number;
    diferenca: number;
  }[],
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  for (const stage of stages) {
    if (stage.orcado > 0) {
      const comprometido = stage.realizado + stage.aPagar;
      const percentual = (comprometido / stage.orcado) * 100;
      if (percentual > 100) {
        alerts.push({ tipo: "danger", mensagem: `${stage.nome} ultrapassou o orçamento previsto.` });
      } else if (percentual >= 85) {
        alerts.push({ tipo: "warning", mensagem: `${stage.nome} atingiu ${percentual.toFixed(0)}% do orçamento.` });
      }
    }
    if (stage.diferenca > 15) {
      alerts.push({
        tipo: "warning",
        mensagem: `${stage.nome} possui consumo financeiro superior ao avanço físico.`,
      });
    }
  }
  return alerts;
}
