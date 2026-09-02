import { z } from "zod";

export const costTypeValues = [
  "MATERIAL",
  "MAO_DE_OBRA",
  "SERVICO_TERCEIRIZADO",
  "EQUIPAMENTO",
  "TRANSPORTE",
  "OUTROS",
] as const;

export const budgetItemFormSchema = z
  .object({
    workId: z.string().min(1),
    // Um item pertence a UMA atividade OU é um valor solto direto numa etapa — nunca os dois.
    taskId: z.string().optional().or(z.literal("").transform(() => undefined)),
    stageId: z.string().optional().or(z.literal("").transform(() => undefined)),
    codigo: z.string().trim().optional(),
    descricao: z.string().trim().optional(),
    tipoCusto: z.enum(costTypeValues),
    unidade: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
    quantidadePrevista: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
    valorUnitarioPrevisto: z.coerce.number().nonnegative().optional().or(z.literal("").transform(() => undefined)),
    valorTotalPrevisto: z.coerce.number().nonnegative().optional().or(z.literal("").transform(() => undefined)),
    observacoes: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.taskId) !== Boolean(data.stageId), {
    message: "Selecione a atividade ou a etapa (não os dois).",
    path: ["taskId"],
  })
  .refine(
    (data) =>
      data.valorTotalPrevisto !== undefined ||
      (data.quantidadePrevista !== undefined && data.valorUnitarioPrevisto !== undefined),
    { message: "Informe o valor total previsto ou quantidade + valor unitário.", path: ["valorTotalPrevisto"] },
  );

export type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;
