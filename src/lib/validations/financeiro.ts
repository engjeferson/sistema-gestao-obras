import { z } from "zod";

export const transactionTypeValues = ["PAGAR", "RECEBER"] as const;
export const transactionStatusValues = ["PENDENTE", "PAGO", "VENCIDO"] as const;
export const paymentMethodValues = [
  "DINHEIRO",
  "PIX",
  "BOLETO",
  "CARTAO",
  "TRANSFERENCIA",
  "CHEQUE",
  "OUTROS",
] as const;

export const transactionFormSchema = z.object({
  workId: z.string().optional().or(z.literal("").transform(() => undefined)),
  tipo: z.enum(transactionTypeValues),
  descricao: z.string().trim().min(1, "Informe a descrição."),
  categoriaId: z.string().min(1, "Selecione a categoria."),
  favorecidoNome: z.string().trim().min(1, "Informe o fornecedor ou cliente."),
  bankAccountId: z.string().optional().or(z.literal("").transform(() => undefined)),
  stageId: z.string().optional().or(z.literal("").transform(() => undefined)),
  taskId: z.string().optional().or(z.literal("").transform(() => undefined)),
  valor: z.coerce.number({ message: "Informe um valor válido." }).positive("Informe um valor maior que zero."),
  dataEmissao: z.string().min(1, "Informe a data de emissão."),
  dataVencimento: z.string().min(1, "Informe a data de vencimento."),
  dataPagamento: z.string().optional(),
  formaPagamento: z.enum(paymentMethodValues).optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(transactionStatusValues),
  observacao: z.string().trim().optional(),
  parcelar: z.boolean().optional(),
  numeroParcelas: z.coerce.number().int().min(2).max(60).optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
