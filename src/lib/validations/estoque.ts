import { z } from "zod";

export const stockEntradaSchema = z.object({
  materialId: z.string().min(1, "Selecione o material."),
  destinoWorkId: z.string().optional().or(z.literal("").transform(() => undefined)),
  quantidade: z.coerce.number().positive("Informe uma quantidade maior que zero."),
  valorUnitario: z.coerce.number().nonnegative().optional(),
  data: z.string().min(1, "Informe a data."),
  motivo: z.string().trim().optional(),
});

export const stockSaidaSchema = z.object({
  materialId: z.string().min(1, "Selecione o material."),
  origemWorkId: z.string().optional().or(z.literal("").transform(() => undefined)),
  quantidade: z.coerce.number().positive("Informe uma quantidade maior que zero."),
  valorUnitario: z.coerce.number().nonnegative().optional(),
  data: z.string().min(1, "Informe a data."),
  motivo: z.string().trim().optional(),
});

export const stockTransferItemSchema = z.object({
  materialId: z.string().min(1, "Selecione o material."),
  quantidade: z.coerce.number().positive("Informe uma quantidade maior que zero."),
  valorUnitario: z.coerce.number().nonnegative().optional(),
});

export const stockTransferenciaSchema = z
  .object({
    origemWorkId: z.string().optional().or(z.literal("").transform(() => undefined)),
    destinoWorkId: z.string().optional().or(z.literal("").transform(() => undefined)),
    data: z.string().min(1, "Informe a data."),
    motivo: z.string().trim().optional(),
    itens: z.array(stockTransferItemSchema).min(1, "Adicione ao menos um item para transferir."),
  })
  .refine((data) => (data.origemWorkId ?? "") !== (data.destinoWorkId ?? ""), {
    message: "Origem e destino não podem ser o mesmo local.",
    path: ["destinoWorkId"],
  });

export type StockEntradaFormValues = z.infer<typeof stockEntradaSchema>;
export type StockSaidaFormValues = z.infer<typeof stockSaidaSchema>;
export type StockTransferItemValues = z.infer<typeof stockTransferItemSchema>;
export type StockTransferenciaFormValues = z.infer<typeof stockTransferenciaSchema>;
