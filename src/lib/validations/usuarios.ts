import { z } from "zod";

export const roleValues = ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO", "OBRA"] as const;

export const userFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
  role: z.enum(roleValues),
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
});

export type UserEditFormValues = z.infer<typeof userEditFormSchema>;
