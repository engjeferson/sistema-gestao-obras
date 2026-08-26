import { z } from "zod";

export const stageFormSchema = z.object({
  workId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  nome: z.string().trim().min(1, "Informe o nome da etapa."),
});

export const taskFormSchema = z.object({
  workId: z.string().min(1),
  stageId: z.string().min(1, "Selecione a etapa."),
  nome: z.string().trim().min(1, "Informe o nome da atividade."),
  dataInicioPrevista: z.string().min(1, "Informe a data de início."),
  dataFimPrevista: z.string().min(1, "Informe a data de fim."),
});

export type StageFormValues = z.infer<typeof stageFormSchema>;
export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const bulkPlanningRowSchema = z.object({
  clientId: z.string().min(1),
  tipo: z.enum(["ETAPA", "ATIVIDADE"]),
  // Pai pode ser: vazio (nível superior, só ETAPA), "existing:<id>" (etapa/sub já existente no
  // banco) ou o clientId de outra linha ETAPA deste mesmo lote.
  parentClientId: z.string().optional(),
  nome: z.string().trim().min(1, "Informe o nome."),
  dataInicioPrevista: z.string().optional(),
  dataFimPrevista: z.string().optional(),
  predecessorClientIds: z.array(z.string()).optional(),
  // Orçamento previsto opcional por atividade — vira um BudgetItem só (sem detalhamento por
  // material/mão de obra); detalhar item por item continua sendo feito na tela de Orçamento.
  custoPrevisto: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  tipoCusto: z
    .enum(["MATERIAL", "MAO_DE_OBRA", "SERVICO_TERCEIRIZADO", "EQUIPAMENTO", "TRANSPORTE", "OUTROS"])
    .optional(),
});

export const bulkPlanningSchema = z.object({
  workId: z.string().min(1),
  rows: z.array(bulkPlanningRowSchema).min(1, "Adicione ao menos uma linha."),
});

export type BulkPlanningRowValues = z.infer<typeof bulkPlanningRowSchema>;
export type BulkPlanningValues = z.infer<typeof bulkPlanningSchema>;
