import { z } from "zod";

export const clientPersonSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  dataAniversario: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const clientFormSchema = z.object({
  people: z.array(clientPersonSchema).min(1, "Informe ao menos uma pessoa."),
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
export type ClientPersonValues = z.infer<typeof clientPersonSchema>;
