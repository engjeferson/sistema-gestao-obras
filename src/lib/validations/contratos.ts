import { z } from "zod";
import { paymentMethodValues } from "@/lib/validations/financeiro";

export const contractTypeValues = [
  "CONTRATO_CLIENTE",
  "EMPREITADA",
  "PRESTADOR_SERVICO",
  "FORNECEDOR",
  "ADITIVO",
  "OUTROS",
] as const;

export const contractDirecaoValues = ["PAGAR", "RECEBER"] as const;

export const contractFormSchema = z
  .object({
    workId: z.string().min(1, "Selecione a obra."),
    nome: z.string().trim().min(1, "Informe o nome do contrato."),
    tipo: z.enum(contractTypeValues),
    direcao: z.enum(contractDirecaoValues),
    // Despesa (PAGAR): contratante é sempre a própria empresa (servidor preenche via CompanySettings),
    // contratado resolve/cria um Fornecedor de verdade a partir do nome digitado.
    // Receita (RECEBER): contratante é um Cliente real (escolhido aqui), contratado é sempre a empresa.
    contratanteClientId: z.string().optional().or(z.literal("").transform(() => undefined)),
    contratadoNome: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
    valor: z.coerce.number().nonnegative().optional().or(z.literal("").transform(() => undefined)),
    data: z.string().min(1, "Informe a data."),
    observacoes: z.string().trim().optional(),
  })
  .refine((data) => data.direcao !== "RECEBER" || Boolean(data.contratanteClientId), {
    message: "Selecione o cliente contratante.",
    path: ["contratanteClientId"],
  })
  .refine((data) => data.direcao !== "PAGAR" || Boolean(data.contratadoNome), {
    message: "Informe o contratado.",
    path: ["contratadoNome"],
  });

export type ContractFormValues = z.infer<typeof contractFormSchema>;

export const measurementFormSchema = z.object({
  contractId: z.string().min(1),
  workId: z.string().min(1),
  data: z.string().min(1, "Informe a data."),
  dataVencimento: z.string().min(1, "Informe a data de vencimento."),
  valor: z.coerce.number().positive("Informe um valor maior que zero."),
  categoriaId: z.string().min(1, "Selecione a categoria."),
  bankAccountId: z.string().optional().or(z.literal("").transform(() => undefined)),
  // Opcional — pra poder acompanhar depois quanto de cada etapa já foi de fato pago, não só o
  // previsto (mesmo campo/padrão do lançamento financeiro avulso e da nota fiscal).
  stageId: z.string().optional().or(z.literal("").transform(() => undefined)),
  taskId: z.string().optional().or(z.literal("").transform(() => undefined)),
  descricao: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  arquivoUrl: z.string().optional(),
  confirmar: z.boolean().optional(),
  formaPagamento: z.enum(paymentMethodValues).optional().or(z.literal("").transform(() => undefined)),
});

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

export const contractAddendumFormSchema = z.object({
  contractId: z.string().min(1),
  workId: z.string().min(1),
  data: z.string().min(1, "Informe a data."),
  valor: z.coerce.number().positive("Informe um valor maior que zero."),
  descricao: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  arquivoUrl: z.string().optional(),
});

export type ContractAddendumFormValues = z.infer<typeof contractAddendumFormSchema>;
