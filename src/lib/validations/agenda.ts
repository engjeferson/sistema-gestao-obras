import { z } from "zod";

export const agendaEventFormSchema = z
  .object({
    titulo: z.string().trim().min(1, "Informe o título do compromisso."),
    descricao: z.string().trim().optional(),
    local: z.string().trim().optional(),
    data: z.string().min(1, "Informe a data."),
    hora: z.string().optional(),
    horaFim: z.string().optional(),
    diaTodo: z.coerce.boolean().optional(),
    workId: z.string().optional().or(z.literal("").transform(() => undefined)),
    clientId: z.string().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((data) => data.diaTodo || !!data.hora, {
    message: "Informe o horário ou marque como dia inteiro.",
    path: ["hora"],
  });

export type AgendaEventFormValues = z.infer<typeof agendaEventFormSchema>;
