import { z } from "zod";

export const occurrenceTypeValues = [
  "PROBLEMA",
  "ATRASO",
  "FALTA_MATERIAL",
  "ALTERACAO",
  "VISITA",
  "OBSERVACAO",
] as const;

export const rdoWorkerSchema = z.object({
  funcao: z.string().trim().min(1),
  quantidade: z.coerce.number().int().positive(),
});

// `planningTaskId`/`planningStageId` são mutuamente exclusivos: etapa quando ela funciona como
// "atividade solta" (sem nenhuma atividade cadastrada), tarefa nos demais casos.
export const rdoActivitySchema = z
  .object({
    planningTaskId: z.string().optional().or(z.literal("").transform(() => undefined)),
    planningStageId: z.string().optional().or(z.literal("").transform(() => undefined)),
    descricaoServico: z.string().trim().optional(),
    percentualAtual: z.coerce.number().min(0).max(100),
  })
  .refine((data) => Boolean(data.planningTaskId) !== Boolean(data.planningStageId), {
    message: "Selecione a atividade.",
    path: ["planningTaskId"],
  });

export const rdoOccurrenceSchema = z.object({
  tipo: z.enum(occurrenceTypeValues),
  descricao: z.string().trim().min(1),
});

export const rdoPhotoSchema = z.object({
  url: z.string().min(1),
  descricao: z.string().trim().optional(),
});

export const rdoFormSchema = z.object({
  workId: z.string().min(1),
  data: z.string().min(1, "Informe a data."),
  clima: z.string().trim().optional(),
  observacoesGerais: z.string().trim().optional(),
  workers: z.array(rdoWorkerSchema).default([]),
  activities: z.array(rdoActivitySchema).default([]),
  occurrences: z.array(rdoOccurrenceSchema).default([]),
  photos: z.array(rdoPhotoSchema).default([]),
});

export type RdoFormValues = z.infer<typeof rdoFormSchema>;
export type RdoWorkerValues = z.infer<typeof rdoWorkerSchema>;
export type RdoActivityValues = z.infer<typeof rdoActivitySchema>;
export type RdoOccurrenceValues = z.infer<typeof rdoOccurrenceSchema>;
export type RdoPhotoValues = z.infer<typeof rdoPhotoSchema>;
