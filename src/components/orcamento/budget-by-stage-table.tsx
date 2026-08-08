import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL } from "@/lib/status-labels";

type StageRow = {
  id: string;
  codigo: string | null;
  nome: string;
  orcado: number;
  realizado: number;
  aPagar: number;
  projetado: number;
  saldo: number;
  avancoFisico: number;
  avancoFinanceiro: number;
  status: "ATENCAO" | "DENTRO_DO_ESPERADO";
  tasks: {
    id: string;
    codigo: string | null;
    nome: string;
    orcado: number;
    realizado: number;
    aPagar: number;
    projetado: number;
    saldo: number;
    avancoFisico: number;
    avancoFinanceiro: number;
    status: "ATENCAO" | "DENTRO_DO_ESPERADO";
  }[];
};

function StatusBadge({ status }: { status: "ATENCAO" | "DENTRO_DO_ESPERADO" }) {
  return (
    <Badge variant={status === "ATENCAO" ? "destructive" : "success"}>
      {status === "ATENCAO" ? "Atenção" : "Dentro do esperado"}
    </Badge>
  );
}

function Row({ row, indent }: { row: StageRow | StageRow["tasks"][number]; indent?: boolean }) {
  return (
    <tr className="border-b last:border-0">
      <td className={`p-2 font-medium ${indent ? "pl-6 font-normal text-muted-foreground" : ""}`}>
        {row.codigo ? `${row.codigo} — ` : ""}
        {row.nome}
      </td>
      <td className="p-2">{formatCurrencyBRL(row.orcado)}</td>
      <td className="p-2">{formatCurrencyBRL(row.realizado)}</td>
      <td className="p-2">{formatCurrencyBRL(row.aPagar)}</td>
      <td className="p-2">{formatCurrencyBRL(row.projetado)}</td>
      <td className={`p-2 ${row.saldo < 0 ? "text-destructive" : ""}`}>{formatCurrencyBRL(row.saldo)}</td>
      <td className="p-2">{row.avancoFisico.toFixed(0)}%</td>
      <td className="p-2">{row.avancoFinanceiro.toFixed(0)}%</td>
      <td className="p-2">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}

export function BudgetByStageTable({ stages }: { stages: StageRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orçamento por etapa — previsto × realizado × físico × financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Etapa / Atividade</th>
                  <th className="p-2">Orçado</th>
                  <th className="p-2">Realizado</th>
                  <th className="p-2">A pagar</th>
                  <th className="p-2">Projetado</th>
                  <th className="p-2">Saldo</th>
                  <th className="p-2">Avanço físico</th>
                  <th className="p-2">Avanço financeiro</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => (
                  <Fragment key={stage.id}>
                    <Row row={stage} />
                    {stage.tasks.map((task) => (
                      <Row key={task.id} row={task} indent />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
