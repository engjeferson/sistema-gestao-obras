"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  addPlanningDependencyByCode,
  clearStagePredecessorRef,
  removeGroupedDependency,
  type PredecessorChip,
} from "@/server/actions/planejamento";

/**
 * Célula de predecessoras reutilizável tanto pra uma Atividade (owner = ownerTaskId) quanto pra
 * uma Etapa/Sub inteira (owner = ownerStageId) — nesse caso a predecessora passa a valer pra
 * todos os itens dela. Texto livre com os códigos separados por vírgula (ex: "1.1, 2.3"), resolvido
 * só ao sair do campo: compara com as predecessoras atuais e chama add/remove pra cada diferença.
 */
export function PredecessorsCell({
  workId,
  ownerStageId = null,
  ownerTaskId = null,
  ownCode,
  chips,
  options,
  manualRef = null,
}: {
  workId: string;
  ownerStageId?: string | null;
  ownerTaskId?: string | null;
  ownCode: string;
  chips: PredecessorChip[];
  options: { value: string; label: string }[];
  // Código "lembrado" numa etapa sem atividades (ver `predecessorRef`) — não existe vínculo de
  // verdade por trás (não há atividade pra sustentar), então só entra na exibição quando não há
  // nenhum chip real.
  manualRef?: string | null;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const displayText = chips.length > 0 ? chips.map((c) => c.codigo || c.nome).join(", ") : (manualRef ?? "");
  const validCodes = new Set(options.map((o) => o.value));

  function commit(text: string) {
    const typedCodes = [...new Set(text.split(",").map((s) => s.trim()).filter(Boolean))];
    const currentCodes = new Set(chips.map((c) => c.codigo));

    const toAdd = typedCodes.filter((code) => code !== ownCode && validCodes.has(code) && !currentCodes.has(code));
    const toRemove = chips.filter((c) => !typedCodes.includes(c.codigo));
    const clearManualRef = ownerStageId && manualRef && chips.length === 0 && typedCodes.length === 0;

    if (toAdd.length === 0 && toRemove.length === 0 && !clearManualRef) return;

    startTransition(async () => {
      try {
        for (const chip of toRemove) {
          await removeGroupedDependency(
            workId,
            chip.type === "stage" ? chip.id : null,
            chip.type === "task" ? chip.id : null,
            ownerStageId,
            ownerTaskId,
          );
        }
        for (const code of toAdd) {
          await addPlanningDependencyByCode(workId, code, ownerStageId, ownerTaskId);
        }
        if (clearManualRef && ownerStageId) {
          await clearStagePredecessorRef(ownerStageId, workId);
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível atualizar as predecessoras.");
      }
    });
  }

  return (
    <Input
      value={draft ?? displayText}
      onFocus={() => setDraft(displayText)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        commit(e.target.value);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder="Ex: 1.1, 2.3"
      disabled={isPending}
      className="h-6 w-44 text-xs"
    />
  );
}
