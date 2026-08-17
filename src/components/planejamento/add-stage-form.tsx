import type { PlainStage } from "@/components/planejamento/stage-list";

export function flattenStageOptions(stages: PlainStage[], depth = 0): { id: string; label: string }[] {
  return stages.flatMap((stage) => [
    { id: stage.id, label: `${"— ".repeat(depth)}${stage.codigo} ${stage.nome}` },
    ...flattenStageOptions(stage.children, depth + 1),
  ]);
}
