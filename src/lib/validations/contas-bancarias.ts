import { z } from "zod";

export const bankAccountTypeValues = ["CORRENTE", "POUPANCA", "CAIXA", "CARTAO_CREDITO", "OUTRA"] as const;

export const bankAccountFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da conta."),
  banco: z.string().trim().optional(),
  agencia: z.string().trim().optional(),
  conta: z.string().trim().optional(),
  tipo: z.enum(bankAccountTypeValues),
  saldoInicial: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  diaFechamento: z.coerce.number().int().min(1).max(28).optional().or(z.literal("").transform(() => undefined)),
  diaVencimento: z.coerce.number().int().min(1).max(28).optional().or(z.literal("").transform(() => undefined)),
  observacoes: z.string().trim().optional(),
});

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;
