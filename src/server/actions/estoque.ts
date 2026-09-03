"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { computeSaldo, computeSaldoComValor } from "@/lib/stock";
import { stockEntradaSchema, stockSaidaSchema, stockTransferenciaSchema } from "@/lib/validations/estoque";
import { getCurrentWorkAccess } from "@/server/actions/permissions";

function normalizeWorkId(value: string | null | undefined) {
  return value && value.length > 0 ? value : null;
}

export async function getStockBalances(workId?: string | null) {
  const local = normalizeWorkId(workId);
  const workAccess = await getCurrentWorkAccess();
  if (local && workAccess !== null && !workAccess.includes(local)) {
    return [];
  }

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
  const workAccess = await getCurrentWorkAccess();
  if (local && workAccess !== null && !workAccess.includes(local)) {
    return [];
  }
  const workScopeOr =
    filters?.workId !== undefined
      ? [{ origemWorkId: local }, { destinoWorkId: local }]
      : workAccess !== null
        ? [{ origemWorkId: { in: workAccess } }, { destinoWorkId: { in: workAccess } }]
        : undefined;

  return prisma.stockMovement.findMany({
    where: {
      materialId: filters?.materialId,
      stageId: filters?.stageId,
      tipo: filters?.tipo,
      OR: workScopeOr,
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
    taskId: formData.get("taskId") ?? undefined,
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
      taskId: data.destinoWorkId ? data.taskId || null : null,
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
    taskId: formData.get("taskId") ?? undefined,
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
      taskId: origem ? data.taskId || null : null,
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
    taskId: formData.get("taskId") ?? undefined,
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
  const taskId = destino ? data.taskId || null : null;

  const custosMedios = new Map<string, number>();
  for (const item of data.itens) {
    const saldoAtual = await getSaldoAtual(item.materialId, origem);
    if (saldoAtual < item.quantidade) {
      return `Saldo insuficiente na origem para este material. Saldo atual: ${saldoAtual}.`;
    }
    custosMedios.set(item.materialId, await getCustoMedioAtual(item.materialId, origem));
  }

  const grupoId = randomUUID();
  const ultimaOS = await prisma.stockMovement.aggregate({
    where: { tipo: "TRANSFERENCIA" },
    _max: { numeroOS: true },
  });
  const numeroOS = (ultimaOS._max.numeroOS ?? 0) + 1;

  await prisma.$transaction(
    data.itens.map((item) =>
      prisma.stockMovement.create({
        data: {
          materialId: item.materialId,
          tipo: "TRANSFERENCIA",
          origemWorkId: origem,
          destinoWorkId: destino,
          stageId,
          taskId,
          quantidade: item.quantidade,
          // Mantém o mesmo custo já registrado na origem — não se cria valor na transferência.
          valorUnitario: custosMedios.get(item.materialId) ?? null,
          data: new Date(data.data),
          motivo: data.motivo || null,
          transferGrupoId: grupoId,
          numeroOS,
          createdById: session.user.id,
        },
      }),
    ),
  );

  revalidatePath("/estoque");
  redirect(`/estoque/transferencias/${grupoId}`);
}

export async function getStockTransferByGrupoId(grupoId: string) {
  const workAccess = await getCurrentWorkAccess();

  const movements = await prisma.stockMovement.findMany({
    where: { transferGrupoId: grupoId, tipo: "TRANSFERENCIA" },
    include: { material: true, origemWork: true, destinoWork: true, stage: true, task: true, createdBy: true },
    orderBy: { createdAt: "asc" },
  });
  if (movements.length === 0) {
    return null;
  }

  const [first] = movements;
  if (
    workAccess !== null &&
    !(first.origemWorkId && workAccess.includes(first.origemWorkId)) &&
    !(first.destinoWorkId && workAccess.includes(first.destinoWorkId))
  ) {
    return null;
  }

  return {
    grupoId,
    numeroOS: first.numeroOS,
    data: first.data,
    motivo: first.motivo,
    origemWork: first.origemWork,
    destinoWork: first.destinoWork,
    stage: first.stage,
    task: first.task,
    createdBy: first.createdBy,
    itens: movements.map((m) => ({
      material: m.material,
      quantidade: Number(m.quantidade),
      valorUnitario: m.valorUnitario !== null ? Number(m.valorUnitario) : null,
    })),
  };
}

export type AppropriationMaterial = {
  materialId: string;
  nome: string;
  unidade: string | null;
  categoria: string | null;
  quantidade: number;
  valor: number;
};

export type AppropriationNode = {
  id: string;
  tipo: "stage" | "task";
  codigo: string | null;
  nome: string;
  ordem: number;
  parentId: string | null;
  valor: number;
  maoDeObra: number;
  materiaisDiretos: AppropriationMaterial[];
  children: AppropriationNode[];
};

/**
 * Árvore de apropriação de material e mão de obra por etapa/subetapa/
 * atividade de uma obra. Os valores são somas cumulativas (não um saldo
 * líquido): toda movimentação/lançamento com stageId/taskId preenchido
 * representa custo alocado àquele nó — material via StockMovement (entrada
 * direto lá, saída de uso, ou transferência com destino lá), mão de obra via
 * FinancialTransaction da categoria "Mão de obra" (qualquer status — reflete
 * o total comprometido, não só o já pago).
 */
export async function getStockAppropriationTree(workId: string): Promise<AppropriationNode[]> {
  const [stages, movements, maoDeObraCategoria] = await Promise.all([
    prisma.planningStage.findMany({
      where: { workId },
      include: { tasks: { orderBy: { ordem: "asc" } } },
      orderBy: { ordem: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: {
        OR: [{ origemWorkId: workId }, { destinoWorkId: workId }],
        NOT: { stageId: null, taskId: null },
      },
      select: {
        materialId: true,
        stageId: true,
        taskId: true,
        quantidade: true,
        valorUnitario: true,
        material: { select: { nome: true, unidadePadrao: true, categoria: true } },
      },
    }),
    prisma.financialCategory.findFirst({ where: { nome: "Mão de obra" }, select: { id: true } }),
  ]);

  const maoDeObraTransactions = maoDeObraCategoria
    ? await prisma.financialTransaction.findMany({
        where: {
          workId,
          categoriaId: maoDeObraCategoria.id,
          NOT: { stageId: null, taskId: null },
        },
        select: { valor: true, stageId: true, taskId: true },
      })
    : [];

  const maoDeObraByStage = new Map<string, number>();
  const maoDeObraByTask = new Map<string, number>();
  for (const t of maoDeObraTransactions) {
    if (t.taskId) {
      maoDeObraByTask.set(t.taskId, (maoDeObraByTask.get(t.taskId) ?? 0) + Number(t.valor));
    } else if (t.stageId) {
      maoDeObraByStage.set(t.stageId, (maoDeObraByStage.get(t.stageId) ?? 0) + Number(t.valor));
    }
  }

  type Mov = (typeof movements)[number];

  function aggregateMateriais(movs: Mov[]): AppropriationMaterial[] {
    const byMaterial = new Map<string, AppropriationMaterial>();
    for (const m of movs) {
      const existing = byMaterial.get(m.materialId) ?? {
        materialId: m.materialId,
        nome: m.material.nome,
        unidade: m.material.unidadePadrao,
        categoria: m.material.categoria,
        quantidade: 0,
        valor: 0,
      };
      existing.quantidade += Number(m.quantidade);
      existing.valor += Number(m.quantidade) * Number(m.valorUnitario ?? 0);
      byMaterial.set(m.materialId, existing);
    }
    return Array.from(byMaterial.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  const movementsByStage = new Map<string, Mov[]>();
  const movementsByTask = new Map<string, Mov[]>();
  for (const m of movements) {
    if (m.taskId) {
      const list = movementsByTask.get(m.taskId) ?? [];
      list.push(m);
      movementsByTask.set(m.taskId, list);
    } else if (m.stageId) {
      const list = movementsByStage.get(m.stageId) ?? [];
      list.push(m);
      movementsByStage.set(m.stageId, list);
    }
  }

  const nodeById = new Map<string, AppropriationNode>();
  for (const stage of stages) {
    const taskNodes: AppropriationNode[] = stage.tasks.map((task) => ({
      id: task.id,
      tipo: "task",
      codigo: task.codigo,
      nome: task.nome,
      ordem: task.ordem,
      parentId: stage.id,
      valor: 0,
      maoDeObra: maoDeObraByTask.get(task.id) ?? 0,
      materiaisDiretos: aggregateMateriais(movementsByTask.get(task.id) ?? []),
      children: [],
    }));

    nodeById.set(stage.id, {
      id: stage.id,
      tipo: "stage",
      codigo: stage.codigo,
      nome: stage.nome,
      ordem: stage.ordem,
      parentId: stage.parentId,
      valor: 0,
      maoDeObra: maoDeObraByStage.get(stage.id) ?? 0,
      materiaisDiretos: aggregateMateriais(movementsByStage.get(stage.id) ?? []),
      children: taskNodes,
    });
  }

  const roots: AppropriationNode[] = [];
  for (const node of nodeById.values()) {
    if (node.tipo === "stage" && node.parentId && nodeById.has(node.parentId)) {
      nodeById.get(node.parentId)!.children.push(node);
    } else if (node.tipo === "stage") {
      roots.push(node);
    }
  }

  function finalize(node: AppropriationNode): void {
    node.children.sort((a, b) => a.ordem - b.ordem);
    const ownValue = node.materiaisDiretos.reduce((sum, m) => sum + m.valor, 0);
    const ownMaoDeObra = node.maoDeObra;
    for (const child of node.children) finalize(child);
    node.valor = ownValue + node.children.reduce((sum, child) => sum + child.valor, 0);
    node.maoDeObra = ownMaoDeObra + node.children.reduce((sum, child) => sum + child.maoDeObra, 0);
  }

  roots.sort((a, b) => a.ordem - b.ordem);
  for (const root of roots) finalize(root);

  return roots;
}
