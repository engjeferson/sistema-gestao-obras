"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { materialFormSchema } from "@/lib/validations/materiais";

export async function listMaterials() {
  const materials = await prisma.material.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { invoiceItems: true, stockMovements: true } } },
  });
  return materials.map(({ _count, ...material }) => ({
    ...material,
    usado: _count.invoiceItems > 0 || _count.stockMovements > 0,
  }));
}

export async function listActiveMaterials() {
  return prisma.material.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}

export async function getMaterial(materialId: string) {
  return prisma.material.findUnique({ where: { id: materialId } });
}

export async function getMaterialPriceHistory(materialId: string) {
  const items = await prisma.invoiceItem.findMany({
    where: { materialId },
    select: {
      id: true,
      quantidade: true,
      valorUnitario: true,
      invoice: { select: { numero: true, dataEmissao: true, supplier: { select: { nome: true } } } },
    },
    orderBy: { invoice: { dataEmissao: "desc" } },
    take: 50,
  });

  return items.map((item) => ({
    id: item.id,
    quantidade: Number(item.quantidade),
    valorUnitario: Number(item.valorUnitario),
    numeroNF: item.invoice.numero,
    fornecedorNome: item.invoice.supplier.nome,
    dataEmissao: item.invoice.dataEmissao,
  }));
}

function parseMaterialForm(formData: FormData) {
  return materialFormSchema.safeParse({
    nome: formData.get("nome"),
    unidadePadrao: formData.get("unidadePadrao") ?? "",
    precoUnitario: formData.get("precoUnitario") || undefined,
    categoria: formData.get("categoria") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
  });
}

export async function createMaterial(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseMaterialForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const existing = await prisma.material.findUnique({ where: { nome: data.nome } });
  if (existing) {
    return "Já existe um material com esse nome.";
  }

  await prisma.material.create({
    data: {
      nome: data.nome,
      unidadePadrao: data.unidadePadrao,
      precoUnitario: data.precoUnitario ?? null,
      categoria: data.categoria || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/materiais");
  redirect("/cadastros/materiais");
}

export async function updateMaterial(materialId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = parseMaterialForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.material.update({
    where: { id: materialId },
    data: {
      nome: data.nome,
      unidadePadrao: data.unidadePadrao,
      precoUnitario: data.precoUnitario ?? null,
      categoria: data.categoria || null,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath("/cadastros/materiais");
  redirect("/cadastros/materiais");
}

export async function toggleMaterialActive(materialId: string, ativo: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.material.update({ where: { id: materialId }, data: { ativo } });
  revalidatePath("/cadastros/materiais");
}

// Só pode ser excluído material que nunca entrou em nenhuma NF/entrada nem movimentação de
// estoque (compra, saída, transferência) — se já foi usado em algum lugar, só desativar.
export async function deleteMaterial(materialId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const [invoiceItemsCount, stockMovementsCount] = await Promise.all([
    prisma.invoiceItem.count({ where: { materialId } }),
    prisma.stockMovement.count({ where: { materialId } }),
  ]);
  if (invoiceItemsCount > 0 || stockMovementsCount > 0) {
    throw new Error("Este material já foi utilizado e não pode ser excluído. Desative-o em vez disso.");
  }

  await prisma.material.delete({ where: { id: materialId } });
  revalidatePath("/cadastros/materiais");
}
