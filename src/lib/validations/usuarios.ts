import { z } from "zod";

export const roleValues = ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO", "OBRA"] as const;

const financePermissionFields = {
  verEntradas: z.boolean().optional(),
  verSaidas: z.boolean().optional(),
  verSaldo: z.boolean().optional(),
  verSaudeFinanceira: z.boolean().optional(),
  verSaudeFinanceiraObra: z.boolean().optional(),
  todasCategorias: z.boolean().optional(),
  categoriasPermitidasIds: z.array(z.string()).optional(),
};

const workAccessFields = {
  restringirObras: z.boolean().optional(),
  assignedWorkIds: z.array(z.string()).optional(),
};

const modulePermissionFields = {
  planejamentoSomenteLeitura: z.boolean().optional(),
  rdoSomenteLeitura: z.boolean().optional(),
  contratosSomenteLeitura: z.boolean().optional(),
  notasFiscaisSomenteLeitura: z.boolean().optional(),
  cadastrosSomenteLeitura: z.boolean().optional(),
  financeiroSomenteLeitura: z.boolean().optional(),
};

const visibilityFields = {
  verValoresSensiveis: z.boolean().optional(),
  verContratos: z.boolean().optional(),
  verRelatoriosFinanceiros: z.boolean().optional(),
  verRelatoriosOperacionais: z.boolean().optional(),
};

export const userFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
  role: z.enum(roleValues),
  ...financePermissionFields,
  ...workAccessFields,
  ...modulePermissionFields,
  ...visibilityFields,
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const userEditFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  email: z.email("Informe um e-mail válido."),
  password: z
    .string()
    .min(6, "A senha deve ter ao menos 6 caracteres.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum(roleValues),
  ...financePermissionFields,
  ...workAccessFields,
  ...modulePermissionFields,
  ...visibilityFields,
});

export type UserEditFormValues = z.infer<typeof userEditFormSchema>;
