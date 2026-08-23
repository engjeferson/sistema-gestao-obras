"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { computeSaldo, computeSaldoComValor } from "@/lib/stock";
import { stockEntradaSchema, stockSaidaSchema, stockTransferenciaSchema } from "@/lib/validations/estoque";

function normalizeWorkId(value: string | null | undefined) {
  return value && value.length > 0 ? value : null;
}

export async function getStockBalances(workId?: string | null) {
  const local = normalizeWorkId(workId);

  const movements = await prisma.stockMovement.findMany({
    where: { OR: [{ origemWorkId: local }, { destinoWorkId: local }] },
    select: {
      materialId: true,
      tipo: true,
      origemWorkId: true,
      destinoWorkId: true,
      quantidade: true,
      valorUnitario: true,
      data: true,
      createdAt: true,
    },
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
      const { quantidade: saldo, valorTotal } = computeSaldoComValor(
        movs.map((m) => ({
          ...m,
          quantidade: Number(m.quantidade),
          valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
        })),
        local,
      );
      return {
        materialId,
        materialNome: material?.nome ?? "—",
        unidade: material?.unidadePadrao ?? null,
        saldo,
        valorTotal,
      };
    })
    .sort((a, b) => a.materialNome.localeCompare(b.materialNome));
}

export async function listStockMovements(filters?: {
  workId?: string | null;
  materialId?: string;
  stageId?: string;
  tipo?: "ENTRADA" | "SAIDA" | "TRANSFERENCIA";
  supplierId?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  const local = normalizeWorkId(filters?.workId);
  return prisma.stockMovement.findMany({
    where: {
      materialId: filters?.materialId,
      stageId: filters?.stageId,
      tipo: filters?.tipo,
      OR: filters?.workId !== undefined ? [{ origemWorkId: local }, { destinoWorkId: local }] : undefined,
      invoiceItem: filters?.supplierId ? { invoice: { supplierId: filters.supplierId } } : undefined,
      data: {
        gte: filters?.dataInicio ? new Date(filters.dataInicio) : undefined,
        lte: filters?.dataFim ? new Date(filters.dataFim) : undefined,
      },
    },
    include: { material: true, origemWork: true, destinoWork: true, stage: true, createdBy: true },
    orderBy: { data: "desc" },
    take: 100,
  });
}

export async function getMaterialStockDetail(materialId: string) {
  const [material, movements] = await Promise.all([
    prisma.material.findUnique({ where: { id: materialId } }),
    prisma.stockMovement.findMany({
      where: { materialId },
      include: { material: true, origemWork: true, destinoWork: true, stage: true, createdBy: true },
      orderBy: { data: "desc" },
    }),
  ]);

  if (!material) return null;

  const movsForCalc = movements.map((m) => ({
    tipo: m.tipo,
    origemWorkId: m.origemWorkId,
    destinoWorkId: m.destinoWorkId,
    quantidade: Number(m.quantidade),
    valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
    data: m.data,
    createdAt: m.createdAt,
  }));

  const locations = new Set<string | null>();
  for (const m of movements) {
    locations.add(m.origemWorkId);
    locations.add(m.destinoWorkId);
  }

  const workIds = [...locations].filter((id): id is string => id !== null);
  const works = workIds.length
    ? await prisma.work.findMany({ where: { id: { in: workIds } }, select: { id: true, nome: true, codigo: true } })
    : [];
  const workMap = new Map(works.map((w) => [w.id, w]));

  const saldosPorLocal = [...locations]
    .map((loc) => {
      const { quantidade, valorTotal } = computeSaldoComValor(movsForCalc, loc);
      const work = loc ? workMap.get(loc) : undefined;
      return {
        workId: loc,
        workLabel: loc ? (work ? `${work.codigo} — ${work.nome}` : "—") : "Estoque Geral",
        quantidade,
        valorTotal,
      };
    })
    .filter((s) => s.quantidade !== 0 || s.valorTotal !== 0)
    .sort((a, b) => b.valorTotal - a.valorTotal);

  return { material, movements, saldosPorLocal };
}

export async function getStockBalancesAllLocations(workIds: string[]) {
  const [geral, ...porObra] = await Promise.all([
    getStockBalances(null),
    ...workIds.map((id) => getStockBalances(id)),
  ]);

  const toEntry = (b: Awaited<ReturnType<typeof getStockBalances>>[number]) =>
    [b.materialId, { saldo: b.saldo, custoMedio: b.saldo > 0 ? b.valorTotal / b.saldo : 0 }] as const;

  const map: Record<string, Record<string, { saldo: number; custoMedio: number }>> = {
    geral: Object.fromEntries(geral.map(toEntry)),
  };
  workIds.forEach((id, index) => {
    map[id] = Object.fromEntries(porObra[index].map(toEntry));
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

async function getCustoMedioAtual(materialId: string, workId: string | null) {
  const movements = await prisma.stockMovement.findMany({
    where: { OR: [{ origemWorkId: workId }, { destinoWorkId: workId }], materialId },
    select: {
      tipo: true,
      origemWorkId: true,
      destinoWorkId: true,
      quantidade: true,
      valorUnitario: true,
      data: true,
      createdAt: true,
    },
  });
  const { quantidade, valorTotal } = computeSaldoComValor(
    movements.map((m) => ({
      ...m,
      quantidade: Number(m.quantidade),
      valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
    })),
    workId,
  );
  return quantidade > 0 ? valorTotal / quantidade : 0;
}

export async function createStockEntrada(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = stockEntradaSchema.safeParse({
    materialId: formData.get("materialId"),
    destinoWorkId: formData.get("destinoWorkId") ?? undefined,
    stageId: formData.get("stageId") ?? undefined,
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
      stageId: data.destinoWorkId ? data.stageId || null : null,
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
    stageId: formData.get("stageId") ?? undefined,
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
      stageId: origem ? data.stageId || null : null,
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
    stageId: formData.get("stageId") ?? undefined,
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
  const stageId = destino ? data.stageId || null : null;

  const custosMedios = new Map<string, number>();
  for (const item of data.itens) {
    const saldoAtual = await getSaldoAtual(item.materialId, origem);
    if (saldoAtual < item.quantidade) {
      return `Saldo insuficiente na origem para este material. Saldo atual: ${saldoAtual}.`;
    }
    custosMedios.set(item.materialId, await getCustoMedioAtual(item.materialId, origem));
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
          stageId,
          quantidade: item.quantidade,
          // Mantém o mesmo custo já registrado na origem — não se cria valor na transferência.
          valorUnitario: custosMedios.get(item.materialId) ?? null,
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
