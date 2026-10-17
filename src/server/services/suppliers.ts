import { prisma } from "@/lib/prisma";
import type { SupplierCategory } from "@/generated/prisma/enums";

/**
 * Resolve um fornecedor pelo nome — case-insensitive, pra "Madeireira Quilombo" e
 * "MADEIREIRA QUILOMBO" caírem no mesmo registro em vez de criar duplicata. Sempre grava em
 * maiúsculas (mesmo padrão já usado pra material), então toda criação nova fica uniforme.
 */
export async function findOrCreateSupplierId(nome: string, categoria?: SupplierCategory): Promise<string> {
  const trimmed = nome.trim().toUpperCase();
  // Pode haver mais de um registro batendo (ex: duplicata antiga ainda não limpa) — ordena por
  // ativo e mais antigo primeiro pra sempre reaproveitar o canônico de forma determinística,
  // em vez de cair em qualquer um dos dois ao acaso.
  const existing = await prisma.supplier.findFirst({
    where: { nome: { equals: trimmed, mode: "insensitive" } },
    orderBy: [{ ativo: "desc" }, { createdAt: "asc" }],
  });
  if (existing) return existing.id;
  const created = await prisma.supplier.create({ data: { nome: trimmed, categoria } });
  return created.id;
}
