import { z } from "zod";
import { transactionTypeValues, paymentMethodValues } from "@/lib/validations/financeiro";
import { invoiceItemSchema } from "@/lib/validations/notas-fiscais";

export const preLancamentoFormSchema = z.object({
  workId: z.string().optional().or(z.literal("").transform(() => undefined)),
  stageId: z.string().optional().or(z.literal("").transform(() => undefined)),
  tipo: z.enum(transactionTypeValues),
  descricao: z.string().trim().min(1, "Informe a descrição."),
  categoriaId: z.string().optional().or(z.literal("").transform(() => undefined)),
  favorecidoNome: z.string().trim().optional(),
  valor: z.coerce.number({ message: "Informe um valor válido." }).positive("Informe um valor maior que zero."),
  dataVencimento: z.string().optional().or(z.literal("").transform(() => undefined)),
  observacao: z.string().trim().optional(),
  numeroDocumento: z.string().trim().optional(),
  // Presente (não vazio) = pedido/NF: ao aprovar, vira Nota Fiscal com material e estoque em vez
  // de só uma conta a pagar. Ausente/vazio = lançamento financeiro simples (comportamento de hoje).
  itens: z.array(invoiceItemSchema).optional(),
  valorFrete: z.coerce.number().nonnegative().optional(),
  valorDesconto: z.coerce.number().nonnegative().optional(),
  // Forma de pagamento já definida na revisão — ao aprovar, vai direto pro FinancialTransaction
  // (ou pra Invoice, se for pedido/NF) em vez de precisar editar de novo depois.
  bankAccountId: z.string().optional().or(z.literal("").transform(() => undefined)),
  formaPagamento: z.enum(paymentMethodValues).optional().or(z.literal("").transform(() => undefined)),
  contaPaga: z.boolean().optional(),
  dataPagamento: z.string().optional().or(z.literal("").transform(() => undefined)),
});

export type PreLancamentoFormValues = z.infer<typeof preLancamentoFormSchema>;
