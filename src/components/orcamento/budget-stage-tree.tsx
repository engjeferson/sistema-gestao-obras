import { AddBudgetItemForm } from "@/components/orcamento/add-budget-item-form";
import { DeleteBudgetItemButton } from "@/components/orcamento/delete-budget-item-button";
import { COST_TYPE_LABELS, UNIT_LABELS, formatCurrencyBRL } from "@/lib/status-labels";

export type PlainBudgetItem = {
  id: string;
  codigo: string | null;
  descricao: string | null;
  tipoCusto: string;
  unidade: string | null;
  quantidadePrevista: number | null;
  valorUnitarioPrevisto: number | null;
  valorTotalPrevisto: number;
  observacoes: string | null;
};

export type PlainBudgetTask = {
  id: string;
  codigo: string | null;
  nome: string;
  items: PlainBudgetItem[];
  totalOrcado: number;
};

export type PlainBudgetStage = {
  id: string;
  codigo: string | null;
  nome: string;
  tasks: PlainBudgetTask[];
  totalOrcado: number;
};

export function BudgetStageTree({ stages, workId }: { stages: PlainBudgetStage[]; workId: string }) {
  if (stages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma etapa cadastrada ainda. Crie etapas e atividades na aba Planejamento primeiro.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {stages.map((stage) => (
        <details key={stage.id} className="rounded-lg border" open>
          <summary className="flex cursor-pointer items-center justify-between p-4 font-medium">
            <span>
              {stage.codigo ? <span className="text-muted-foreground">{stage.codigo} — </span> : null}
              {stage.nome}
            </span>
            <span>{formatCurrencyBRL(stage.totalOrcado)}</span>
          </summary>
          <div className="flex flex-col gap-4 border-t p-4">
            {stage.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade nesta etapa ainda (adicione em Planejamento).
              </p>
            ) : (
              stage.tasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {task.codigo ? <span className="text-muted-foreground">{task.codigo} — </span> : null}
                      {task.nome}
                    </p>
                    <p className="text-sm font-medium">{formatCurrencyBRL(task.totalOrcado)}</p>
                  </div>
                  {task.items.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="p-2">Tipo</th>
                            <th className="p-2">Descrição</th>
                            <th className="p-2">Qtd.</th>
                            <th className="p-2">Un.</th>
                            <th className="p-2">Valor unit.</th>
                            <th className="p-2">Total</th>
                            <th className="w-10 p-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {task.items.map((item) => (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="p-2">{COST_TYPE_LABELS[item.tipoCusto]}</td>
                              <td className="p-2">{item.descricao ?? "—"}</td>
                              <td className="p-2">{item.quantidadePrevista ?? "—"}</td>
                              <td className="p-2">{item.unidade ? UNIT_LABELS[item.unidade] : "—"}</td>
                              <td className="p-2">
                                {item.valorUnitarioPrevisto !== null
                                  ? formatCurrencyBRL(item.valorUnitarioPrevisto)
                                  : "—"}
                              </td>
                              <td className="p-2 font-medium">{formatCurrencyBRL(item.valorTotalPrevisto)}</td>
                              <td className="p-2">
                                <DeleteBudgetItemButton itemId={item.id} workId={workId} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <AddBudgetItemForm workId={workId} taskId={task.id} />
                </div>
              ))
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
