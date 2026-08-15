import { z } from "zod";

export const templateRowSchema = z.object({
  clientId: z.string().min(1),
  tipo: z.enum(["ETAPA", "ATIVIDADE"]),
  parentClientId: z.string().optional(),
  codigo: z.string().trim().optional(),
  nome: z.string().trim().min(1, "Informe o nome."),
  offsetInicioDias: z.number().int().min(0).optional(),
  duracaoDias: z.number().int().min(1).optional(),
  predecessorClientIds: z.array(z.string()).optional(),
});

export const createTemplateSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do template."),
  descricao: z.string().trim().optional(),
  rows: z.array(templateRowSchema).min(1, "Adicione ao menos uma linha."),
});

export type TemplateRowValues = z.infer<typeof templateRowSchema>;
export type CreateTemplateValues = z.infer<typeof createTemplateSchema>;

export const applyTemplateSchema = z.object({
  workId: z.string().min(1),
  templateId: z.string().min(1, "Selecione um template."),
  dataInicio: z.string().min(1, "Informe a data de início."),
});
export type ApplyTemplateValues = z.infer<typeof applyTemplateSchema>;

export const saveAsTemplateSchema = z.object({
  workId: z.string().min(1),
  nome: z.string().trim().min(1, "Informe o nome do template."),
  descricao: z.string().trim().optional(),
});
export type SaveAsTemplateValues = z.infer<typeof saveAsTemplateSchema>;
