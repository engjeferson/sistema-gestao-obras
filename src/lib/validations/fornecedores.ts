import { z } from "zod";

export const supplierCategoryValues = [
  "MATERIAIS",
  "CONCRETO",
  "ACO",
  "MADEIRA",
  "ELETRICA",
  "HIDRAULICA",
  "ESQUADRIAS",
  "PINTURA",
  "SERVICOS",
  "LOCACAO",
  "TRANSPORTE",
  "OUTROS",
] as const;

export const supplierFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  nomeFantasia: z.string().trim().optional(),
  documento: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  categoria: z.enum(supplierCategoryValues).optional().or(z.literal("").transform(() => undefined)),
  observacoes: z.string().trim().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
