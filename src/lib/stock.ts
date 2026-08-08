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
