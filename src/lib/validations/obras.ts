import { z } from "zod";

export const workStatusValues = ["PLANEJAMENTO", "EM_ANDAMENTO", "PARALISADA", "CONCLUIDA"] as const;

export const workFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da obra."),
  codigo: z.string().trim().min(1, "Informe o código da obra."),
  clienteNome: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  valorContrato: z.coerce.number({ message: "Informe um valor válido." }).nonnegative(),
  areaConstruida: z.coerce.number().nonnegative().optional().or(z.literal("").transform(() => undefined)),
  dataInicio: z.string().min(1, "Informe a data de início."),
  dataPrevistaTermino: z.string().min(1, "Informe a data prevista de término."),
  status: z.enum(workStatusValues),
  observacoes: z.string().trim().optional(),
});

export type WorkFormValues = z.infer<typeof workFormSchema>;
