import { z } from "zod";
import { unitOfMeasureValues } from "@/lib/validations/notas-fiscais";

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
    taskId: z.string().min(1, "Selecione a atividade."),
    codigo: z.string().trim().optional(),
    descricao: z.string().trim().optional(),
    tipoCusto: z.enum(costTypeValues),
    unidade: z.enum(unitOfMeasureValues).optional().or(z.literal("").transform(() => undefined)),
    quantidadePrevista: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
    valorUnitarioPrevisto: z.coerce.number().nonnegative().optional().or(z.literal("").transform(() => undefined)),
    valorTotalPrevisto: z.coerce.number().nonnegative().optional().or(z.literal("").transform(() => undefined)),
    observacoes: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.valorTotalPrevisto !== undefined ||
      (data.quantidadePrevista !== undefined && data.valorUnitarioPrevisto !== undefined),
    { message: "Informe o valor total previsto ou quantidade + valor unitário.", path: ["valorTotalPrevisto"] },
  );

export type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;
