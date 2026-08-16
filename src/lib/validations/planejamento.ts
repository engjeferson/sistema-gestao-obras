import { z } from "zod";

export const stageFormSchema = z.object({
  workId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  codigo: z.string().trim().optional(),
  nome: z.string().trim().min(1, "Informe o nome da etapa."),
});

export const taskFormSchema = z.object({
  workId: z.string().min(1),
  stageId: z.string().min(1, "Selecione a etapa."),
  codigo: z.string().trim().optional(),
  nome: z.string().trim().min(1, "Informe o nome da atividade."),
  dataInicioPrevista: z.string().min(1, "Informe a data de início."),
  dataFimPrevista: z.string().min(1, "Informe a data de fim."),
});

export type StageFormValues = z.infer<typeof stageFormSchema>;
export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const bulkPlanningRowSchema = z.object({
  clientId: z.string().min(1),
  tipo: z.enum(["ETAPA", "ATIVIDADE"]),
  parentClientId: z.string().optional(),
  codigo: z.string().trim().optional(),
  nome: z.string().trim().min(1, "Informe o nome."),
  dataInicioPrevista: z.string().optional(),
  dataFimPrevista: z.string().optional(),
  predecessorClientIds: z.array(z.string()).optional(),
});

export const bulkPlanningSchema = z.object({
  workId: z.string().min(1),
  rows: z.array(bulkPlanningRowSchema).min(1, "Adicione ao menos uma linha."),
});

export type BulkPlanningRowValues = z.infer<typeof bulkPlanningRowSchema>;
export type BulkPlanningValues = z.infer<typeof bulkPlanningSchema>;
