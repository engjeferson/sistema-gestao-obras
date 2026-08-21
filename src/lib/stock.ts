export function hasAnyStockMovementFilter(filters?: {
  materialId?: string;
  tipo?: string;
  supplierId?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  return Boolean(
    filters?.materialId || filters?.tipo || filters?.supplierId || filters?.dataInicio || filters?.dataFim,
  );
}

export type StockMovementForBalance = {
  tipo: "ENTRADA" | "SAIDA" | "TRANSFERENCIA";
  origemWorkId: string | null;
  destinoWorkId: string | null;
  quantidade: number;
};

function sameLocal(a: string | null, b: string | null) {
  return (a ?? null) === (b ?? null);
}

export function computeSaldo(movements: StockMovementForBalance[], workId: string | null) {
  return movements.reduce((saldo, m) => {
    if ((m.tipo === "ENTRADA" || m.tipo === "TRANSFERENCIA") && sameLocal(m.destinoWorkId, workId)) {
      saldo += m.quantidade;
    }
    if ((m.tipo === "SAIDA" || m.tipo === "TRANSFERENCIA") && sameLocal(m.origemWorkId, workId)) {
      saldo -= m.quantidade;
    }
    return saldo;
  }, 0);
}

export type StockMovementForValuation = StockMovementForBalance & {
  valorUnitario: number | null;
  data: Date;
  createdAt: Date;
};

/**
 * Custo médio ponderado: cada saída consome ao custo médio corrente do local,
 * então o valor do saldo reflete o que realmente está parado ali.
 */
export function computeSaldoComValor(movements: StockMovementForValuation[], workId: string | null) {
  const relevantes = movements
    .filter((m) => sameLocal(m.destinoWorkId, workId) || sameLocal(m.origemWorkId, workId))
    .sort((a, b) => a.data.getTime() - b.data.getTime() || a.createdAt.getTime() - b.createdAt.getTime());

  let quantidade = 0;
  let valorTotal = 0;

  for (const m of relevantes) {
    const entrouAqui = (m.tipo === "ENTRADA" || m.tipo === "TRANSFERENCIA") && sameLocal(m.destinoWorkId, workId);
    const saiuAqui = (m.tipo === "SAIDA" || m.tipo === "TRANSFERENCIA") && sameLocal(m.origemWorkId, workId);

    if (entrouAqui) {
      quantidade += m.quantidade;
      valorTotal += m.quantidade * (m.valorUnitario ?? 0);
    }
    if (saiuAqui) {
      const custoMedio = quantidade > 0 ? valorTotal / quantidade : 0;
      valorTotal -= m.quantidade * custoMedio;
      quantidade -= m.quantidade;
    }
  }

  return { quantidade, valorTotal: Math.max(0, valorTotal) };
}
