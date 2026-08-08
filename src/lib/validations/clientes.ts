import { z } from "zod";

export const clientFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  documento: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
