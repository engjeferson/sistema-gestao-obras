import { z } from "zod";

export const clientFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  documento: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  cep: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  uf: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
