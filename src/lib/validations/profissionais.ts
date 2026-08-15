import { z } from "zod";

export const professionalFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  tipoId: z.string().trim().min(1, "Selecione o tipo de profissional."),
  telefone: z.string().trim().optional(),
  documento: z.string().trim().optional(),
  email: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
});

export type ProfessionalFormValues = z.infer<typeof professionalFormSchema>;
