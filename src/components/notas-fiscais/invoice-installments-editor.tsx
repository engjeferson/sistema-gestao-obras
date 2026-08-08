"use client";

import { useEffect, useState } from "react";
import { addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL } from "@/lib/status-labels";
import type { InvoiceInstallmentValues } from "@/lib/validations/notas-fiscais";

export function InvoiceInstallmentsEditor({
  totalValor,
  parcelas,
  onChange,
}: {
  totalValor: number;
  parcelas: InvoiceInstallmentValues[];
  onChange: (parcelas: InvoiceInstallmentValues[]) => void;
}) {
  const [numeroParcelas, setNumeroParcelas] = useState(Math.max(parcelas.length, 2));
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [temEntrada, setTemEntrada] = useState(false);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [dataEntrada, setDataEntrada] = useState("");
  const [entradaPaga, setEntradaPaga] = useState(true);

  const valorRestante = Math.max(0, totalValor - (temEntrada ? valorEntrada : 0));

  function gerarParcelas() {
    if (!primeiroVencimento) return;
    const n = numeroParcelas;
    const baseValor = Math.floor((valorRestante / n) * 100) / 100;
    const remainder = Math.round((valorRestante - baseValor * n) * 100) / 100;
    const base = new Date(`${primeiroVencimento}T00:00:00`);
    const novas = Array.from({ length: n }, (_, i) => ({
      dataVencimento: addMonths(base, i).toISOString().slice(0, 10),
      valor: i === n - 1 ? baseValor + remainder : baseValor,
    }));
    onChange(novas);
  }

  function updateParcela(index: number, patch: Partial<InvoiceInstallmentValues>) {
    onChange(parcelas.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  // Mantém as parcelas já geradas em dia com o valor total da nota (ex: item alterado depois de gerar as parcelas).
  useEffect(() => {
    if (parcelas.length === 0) return;
    const n = parcelas.length;
    const baseValor = Math.floor((valorRestante / n) * 100) / 100;
    const remainder = Math.round((valorRestante - baseValor * n) * 100) / 100;
    const jaSincronizado = parcelas.every((p, i) => {
      const esperado = i === n - 1 ? baseValor + remainder : baseValor;
      return Math.abs(p.valor - esperado) < 0.005;
    });
    if (jaSincronizado) return;
    onChange(parcelas.map((p, i) => ({ ...p, valor: i === n - 1 ? baseValor + remainder : baseValor })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorRestante]);

  const somaEntradaParcelas = (temEntrada ? valorEntrada : 0) + parcelas.reduce((sum, p) => sum + p.valor, 0);
  const diferenca = totalValor - somaEntradaParcelas;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="temEntrada"
          checked={temEntrada}
          onChange={(e) => setTemEntrada(e.target.checked)}
          className="size-4"
        />
        Teve entrada?
      </label>

      {temEntrada ? (
        <div className="grid gap-4 sm:max-w-lg sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="valorEntrada">Valor da entrada (R$)</Label>
            <Input
              id="valorEntrada"
              name="valorEntrada"
              type="number"
              step="0.01"
              min="0"
              value={valorEntrada || ""}
              onChange={(e) => setValorEntrada(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dataEntrada">Data da entrada</Label>
            <Input
              id="dataEntrada"
              name="dataEntrada"
              type="date"
              value={dataEntrada}
              onChange={(e) => setDataEntrada(e.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end gap-2 pb-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="entradaPaga"
                checked={entradaPaga}
                onChange={(e) => setEntradaPaga(e.target.checked)}
                className="size-4"
              />
              Entrada já foi paga
            </label>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="numeroParcelasNf">
            {temEntrada ? "Número de parcelas (além da entrada)" : "Número de parcelas"}
          </Label>
          <Input
            id="numeroParcelasNf"
            type="number"
            min={temEntrada ? 1 : 2}
            max={60}
            value={numeroParcelas}
            onChange={(e) => setNumeroParcelas(Number(e.target.value))}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="primeiroVencimentoNf">Vencimento da 1ª parcela</Label>
          <Input
            id="primeiroVencimentoNf"
            type="date"
            value={primeiroVencimento}
            onChange={(e) => setPrimeiroVencimento(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={gerarParcelas} disabled={!primeiroVencimento}>
          Gerar parcelas
        </Button>
      </div>

      {parcelas.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Parcela</th>
                <th className="p-2">Vencimento</th>
                <th className="p-2">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((parcela, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="p-2">
                    {index + 1}/{parcelas.length}
                  </td>
                  <td className="p-2">
                    <Input
                      type="date"
                      value={parcela.dataVencimento}
                      onChange={(e) => updateParcela(index, { dataVencimento: e.target.value })}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={parcela.valor}
                      onChange={(e) => updateParcela(index, { valor: Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Escolha o número de parcelas e o vencimento da 1ª, depois clique em &quot;Gerar parcelas&quot;.
        </p>
      )}

      {parcelas.length > 0 ? (
        <p className={`text-sm ${Math.abs(diferenca) > 0.01 ? "text-destructive" : "text-muted-foreground"}`}>
          {temEntrada ? `Entrada: ${formatCurrencyBRL(valorEntrada)} + ` : ""}
          Soma das parcelas: {formatCurrencyBRL(parcelas.reduce((sum, p) => sum + p.valor, 0))} — Valor da nota:{" "}
          {formatCurrencyBRL(totalValor)}
          {Math.abs(diferenca) > 0.01 ? ` (diferença de ${formatCurrencyBRL(diferenca)})` : ""}
        </p>
      ) : null}
    </div>
  );
}
