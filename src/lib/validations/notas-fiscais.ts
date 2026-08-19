import { z } from "zod";

export const unitOfMeasureValues = ["UN", "KG", "M", "M2", "M3", "SACO", "CAIXA", "LITRO"] as const;

export const ESTOQUE_GERAL_VALUE = "__estoque_geral__";

export const invoiceItemSchema = z.object({
  material: z.string().trim().min(1, "Informe o material."),
  quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero."),
  unidade: z.enum(unitOfMeasureValues),
  valorUnitario: z.coerce.number().nonnegative(),
});

export const invoiceInstallmentSchema = z.object({
  dataVencimento: z.string().min(1, "Informe o vencimento da parcela."),
  valor: z.coerce.number().positive("Informe um valor maior que zero."),
});

export const invoiceEntradaSchema = z.object({
  valor: z.coerce.number().positive("Informe um valor de entrada maior que zero."),
  dataVencimento: z.string().min(1, "Informe a data da entrada."),
  paga: z.boolean().optional(),
});

export const invoiceFormSchema = z
  .object({
    workId: z
      .string()
      .min(1, "Selecione a obra ou o Estoque da Empresa.")
      .transform((value) => (value === ESTOQUE_GERAL_VALUE ? null : value)),
    supplierNome: z.string().trim().min(1, "Informe o fornecedor."),
    nome: z.string().trim().optional(),
    stageId: z.string().optional().or(z.literal("").transform(() => undefined)),
    taskId: z.string().optional().or(z.literal("").transform(() => undefined)),
    numero: z.string().trim().min(1, "Informe o número da NF."),
    dataEmissao: z.string().min(1, "Informe a data."),
    categoriaId: z.string().min(1, "Selecione a categoria."),
    observacao: z.string().trim().optional(),
    items: z.array(invoiceItemSchema).min(1, "Adicione ao menos um item."),
    gerarContaPagar: z.boolean().optional(),
    dataVencimento: z.string().optional(),
    bankAccountId: z.string().optional().or(z.literal("").transform(() => undefined)),
    parcelar: z.boolean().optional(),
    temEntrada: z.boolean().optional(),
    entrada: invoiceEntradaSchema.optional(),
    parcelas: z.array(invoiceInstallmentSchema).optional(),
  })
  .refine((data) => !data.parcelar || !data.temEntrada || data.entrada, {
    message: "Informe o valor e a data da entrada.",
    path: ["entrada"],
  })
  .refine((data) => !data.parcelar || (data.parcelas && data.parcelas.length >= (data.temEntrada ? 1 : 2)), {
    message: "Informe ao menos 2 parcelas (ou 1 parcela além da entrada).",
    path: ["parcelas"],
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceItemValues = z.infer<typeof invoiceItemSchema>;
export type InvoiceInstallmentValues = z.infer<typeof invoiceInstallmentSchema>;
export type InvoiceEntradaValues = z.infer<typeof invoiceEntradaSchema>;
