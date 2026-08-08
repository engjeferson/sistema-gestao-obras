"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { computeSaldo } from "@/lib/stock";
import { stockEntradaSchema, stockSaidaSchema, stockTransferenciaSchema } from "@/lib/validations/estoque";

function normalizeWorkId(value: string | null | undefined) {
  return value && value.length > 0 ? value : null;
}

export async function getStockBalances(workId?: string | null) {
  const local = normalizeWorkId(workId);

  const movements = await prisma.stockMovement.findMany({
    where: { OR: [{ origemWorkId: local }, { destinoWorkId: local }] },
    select: { materialId: true, tipo: true, origemWorkId: true, destinoWorkId: true, quantidade: true },
  });

  const materialIds = [...new Set(movements.map((m) => m.materialId))];
  const materials = await prisma.material.findMany({ where: { id: { in: materialIds } } });
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  const byMaterial = new Map<string, typeof movements>();
  for (const m of movements) {
    const list = byMaterial.get(m.materialId) ?? [];
    list.push(m);
    byMaterial.set(m.materialId, list);
  }

  return [...byMaterial.entries()]
    .map(([materialId, movs]) => {
      const material = materialMap.get(materialId);
      const saldo = computeSaldo(
        movs.map((m) => ({ ...m, quantidade: Number(m.quantidade) })),
        local,
      );
      return {
        materialId,
        materialNome: material?.nome ?? "—",
        unidade: material?.unidadePadrao ?? null,
        saldo,
      };
    })
    .sort((a, b) => a.materialNome.localeCompare(b.materialNome));
}

export async function listStockMovements(filters?: { workId?: string | null; materialId?: string }) {
  const local = normalizeWorkId(filters?.workId);
  return prisma.stockMovement.findMany({
    where: {
      materialId: filters?.materialId,
      OR: filters?.workId !== undefined ? [{ origemWorkId: local }, { destinoWorkId: local }] : undefined,
    },
    include: { material: true, origemWork: true, destinoWork: true, createdBy: true },
    orderBy: { data: "desc" },
    take: 100,
  });
}

export async function getStockBalancesAllLocations(workIds: string[]) {
  const [geral, ...porObra] = await Promise.all([
    getStockBalances(null),
    ...workIds.map((id) => getStockBalances(id)),
  ]);

  const map: Record<string, Record<string, number>> = {
    geral: Object.fromEntries(geral.map((b) => [b.materialId, b.saldo])),
  };
  workIds.forEach((id, index) => {
    map[id] = Object.fromEntries(porObra[index].map((b) => [b.materialId, b.saldo]));
  });
  return map;
}

async function getSaldoAtual(materialId: string, workId: string | null) {
  const movements = await prisma.stockMovement.findMany({
    where: { OR: [{ origemWorkId: workId }, { destinoWorkId: workId }], materialId },
    select: { tipo: true, origemWorkId: true, destinoWorkId: true, quantidade: true },
  });
  return computeSaldo(
    movements.map((m) => ({ ...m, quantidade: Number(m.quantidade) })),
    workId,
  );
}

export async function createStockEntrada(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = stockEntradaSchema.safeParse({
    materialId: formData.get("materialId"),
    destinoWorkId: formData.get("destinoWorkId") ?? undefined,
    quantidade: formData.get("quantidade"),
    valorUnitario: formData.get("valorUnitario") || undefined,
    data: formData.get("data"),
    motivo: formData.get("motivo") ?? undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  await prisma.stockMovement.create({
    data: {
      materialId: data.materialId,
      tipo: "ENTRADA",
      destinoWorkId: data.destinoWorkId || null,
      quantidade: data.quantidade,
      valorUnitario: data.valorUnitario ?? null,
      data: new Date(data.data),
      motivo: data.motivo || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/estoque");
  redirect("/estoque");
}

export async function createStockSaida(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = stockSaidaSchema.safeParse({
    materialId: formData.get("materialId"),
    origemWorkId: formData.get("origemWorkId") ?? undefined,
    quantidade: formData.get("quantidade"),
    valorUnitario: formData.get("valorUnitario") || undefined,
    data: formData.get("data"),
    motivo: formData.get("motivo") ?? undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const origem = data.origemWorkId || null;

  const saldoAtual = await getSaldoAtual(data.materialId, origem);
  if (saldoAtual < data.quantidade) {
    return `Saldo insuficiente. Saldo atual: ${saldoAtual}.`;
  }

  await prisma.stockMovement.create({
    data: {
      materialId: data.materialId,
      tipo: "SAIDA",
      origemWorkId: origem,
      quantidade: data.quantidade,
      valorUnitario: data.valorUnitario ?? null,
      data: new Date(data.data),
      motivo: data.motivo || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/estoque");
  redirect("/estoque");
}

export async function createStockTransferencia(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  let itensParsed: unknown;
  try {
    itensParsed = JSON.parse(String(formData.get("itensJson") ?? "[]"));
  } catch {
    return "Itens inválidos.";
  }

  const parsed = stockTransferenciaSchema.safeParse({
    origemWorkId: formData.get("origemWorkId") ?? undefined,
    destinoWorkId: formData.get("destinoWorkId") ?? undefined,
    data: formData.get("data"),
    motivo: formData.get("motivo") ?? undefined,
    itens: itensParsed,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const origem = data.origemWorkId || null;
  const destino = data.destinoWorkId || null;

  for (const item of data.itens) {
    const saldoAtual = await getSaldoAtual(item.materialId, origem);
    if (saldoAtual < item.quantidade) {
      return `Saldo insuficiente na origem para este material. Saldo atual: ${saldoAtual}.`;
    }
  }

  const grupoId = randomUUID();
  await prisma.$transaction(
    data.itens.map((item) =>
      prisma.stockMovement.create({
        data: {
          materialId: item.materialId,
          tipo: "TRANSFERENCIA",
          origemWorkId: origem,
          destinoWorkId: destino,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario ?? null,
          data: new Date(data.data),
          motivo: data.motivo || null,
          transferGrupoId: grupoId,
          createdById: session.user.id,
        },
      }),
    ),
  );

  revalidatePath("/estoque");
  redirect("/estoque");
}
