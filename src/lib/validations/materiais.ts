import { z } from "zod";

export const materialFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do material."),
  unidadePadrao: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  precoUnitario: z.coerce.number().nonnegative().optional(),
  categoria: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;
