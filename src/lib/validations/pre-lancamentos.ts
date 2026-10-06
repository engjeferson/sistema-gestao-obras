import { z } from "zod";
import { transactionTypeValues } from "@/lib/validations/financeiro";

export const preLancamentoFormSchema = z.object({
  workId: z.string().optional().or(z.literal("").transform(() => undefined)),
  stageId: z.string().optional().or(z.literal("").transform(() => undefined)),
  tipo: z.enum(transactionTypeValues),
  descricao: z.string().trim().min(1, "Informe a descrição."),
  categoriaId: z.string().optional().or(z.literal("").transform(() => undefined)),
  favorecidoNome: z.string().trim().optional(),
  valor: z.coerce.number({ message: "Informe um valor válido." }).positive("Informe um valor maior que zero."),
  dataVencimento: z.string().optional().or(z.literal("").transform(() => undefined)),
  observacao: z.string().trim().optional(),
});

export type PreLancamentoFormValues = z.infer<typeof preLancamentoFormSchema>;
