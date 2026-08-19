"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import type { RdoActivityValues } from "@/lib/validations/rdo";

export type PlanningTaskOption = {
  id: string;
  nome: string;
  percentualExecutado: number;
};

export type StageOption = {
  id: string;
  nome: string;
  tasks: PlanningTaskOption[];
};

export function RdoActivitiesEditor({
  activities,
  onChange,
  stages,
}: {
  activities: RdoActivityValues[];
  onChange: (activities: RdoActivityValues[]) => void;
  stages: StageOption[];
}) {
  const allTasks = stages.flatMap((stage) =>
    stage.tasks.map((task) => ({ ...task, etapaNome: stage.nome })),
  );

  function update(index: number, patch: Partial<RdoActivityValues>) {
    onChange(activities.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function findTask(id: string) {
    return allTasks.find((t) => t.id === id);
  }

  return (
    <div className="flex flex-col gap-4">
      {activities.map((activity, index) => {
        const task = findTask(activity.planningTaskId);
        const anterior = task ? task.percentualExecutado : 0;
        const medicaoHoje = Math.max(0, activity.percentualAtual - anterior);
        return (
          <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <NativeSelect
                value={activity.planningTaskId}
                onChange={(e) => {
                  const novoAnterior = findTask(e.target.value)?.percentualExecutado ?? 0;
                  update(index, { planningTaskId: e.target.value, percentualAtual: novoAnterior });
                }}
                className="flex-1"
              >
                <option value="" disabled>
                  Selecione a atividade
                </option>
                {stages.map((stage) => (
                  <optgroup key={stage.id} label={stage.nome}>
                    {stage.tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(activities.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Descrição do serviço realizado (opcional)"
              value={activity.descricaoServico ?? ""}
              onChange={(e) => update(index, { descricaoServico: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Anterior: {anterior.toFixed(0)}%</span>
              <div className="flex items-center gap-2">
                <label className="text-sm">Medição de hoje:</label>
                <Input
                  type="number"
                  min="0"
                  max={100 - anterior}
                  value={medicaoHoje === 0 ? "" : medicaoHoje}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    const digitado = e.target.value === "" ? 0 : Number(e.target.value);
                    update(index, { percentualAtual: Math.min(100, anterior + digitado) });
                  }}
                  className="w-20"
                />
                <span className="text-sm">%</span>
              </div>
              <span className="text-sm text-muted-foreground">→ Total: {activity.percentualAtual.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...activities,
            {
              planningTaskId: allTasks[0]?.id ?? "",
              descricaoServico: "",
              percentualAtual: allTasks[0]?.percentualExecutado ?? 0,
            },
          ])
        }
        disabled={allTasks.length === 0}
      >
        <Plus /> Adicionar atividade executada
      </Button>
      {allTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre etapas e atividades no Planejamento desta obra antes de lançar o RDO.
        </p>
      ) : null}
    </div>
  );
}
