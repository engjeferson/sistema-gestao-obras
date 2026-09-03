/**
 * Calcula em qual fatura do cartão uma compra cai, a partir do dia de
 * fechamento e do dia de vencimento configurados na conta. Compras até o dia
 * de fechamento (inclusive) entram na fatura que fecha nesse mês; depois
 * disso, entram na fatura do mês seguinte. O vencimento cai no mês do
 * fechamento quando é depois dele, ou no mês seguinte quando é antes/igual
 * (ex: fecha dia 25, vence dia 3 do mês seguinte).
 */
export function calcularVencimentoFatura(dataCompra: Date, diaFechamento: number, diaVencimento: number): Date {
  const year = dataCompra.getUTCFullYear();
  let month = dataCompra.getUTCMonth();
  const dia = dataCompra.getUTCDate();

  if (dia > diaFechamento) {
    month += 1;
  }
  if (diaVencimento <= diaFechamento) {
    month += 1;
  }

  return new Date(Date.UTC(year, month, diaVencimento));
}
