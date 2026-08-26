"use server";

import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import {
  sumBudgetItems,
  computeMargemPrevista,
  computeCustoPorM2,
  computeProjetado,
  computeSaldo,
  computeAvancoFinanceiroPercent,
  computeFisicoFinanceiroStatus,
  computeCustoFinalEstimado,
  computeMargemProjetada,
  computeMargemIndicador,
  buildStageAlerts,
} from "@/lib/budget";
import { budgetItemFormSchema } from "@/lib/validations/orcamento";
import { formatCurrencyBRL } from "@/lib/status-labels";

export async function getBudgetVsActualByStage(workId: string) {
  const [stages, budgetItems, transactions, categorias] = await Promise.all([
    prisma.planningStage.findMany({
      where: { workId },
      include: { tasks: { orderBy: { ordem: "asc" } } },
      orderBy: { ordem: "asc" },
    }),
    prisma.budgetItem.findMany({ where: { workId }, select: { taskId: true, valorTotalPrevisto: true } }),
    prisma.financialTransaction.findMany({
      where: { workId, tipo: "PAGAR" },
      select: { valor: true, status: true, stageId: true, taskId: true, categoriaId: true },
    }),
    prisma.financialCategory.findMany({ where: { nome: { in: ["Mão de obra", "Material"] } }, select: { id: true, nome: true } }),
  ]);

  const orcadoByTask = new Map<string, number>();
  for (const item of budgetItems) {
    orcadoByTask.set(item.taskId, (orcadoByTask.get(item.taskId) ?? 0) + Number(item.valorTotalPrevisto));
  }

  const maoDeObraCategoriaId = categorias.find((c) => c.nome === "Mão de obra")?.id;
  const materialCategoriaId = categorias.find((c) => c.nome === "Material")?.id;

  function sumTx(filter: (t: (typeof transactions)[number]) => boolean, statuses: string[]) {
    return transactions
      .filter((t) => filter(t) && statuses.includes(t.status))
      .reduce((sum, t) => sum + Number(t.valor), 0);
  }

  // Comprometido (qualquer status) por categoria — "quanto dessa categoria já
  // está alocado" nessa etapa/atividade, seguindo a mesma ideia de "projetado".
  function sumTxCategoria(filter: (t: (typeof transactions)[number]) => boolean, categoriaId: string | undefined) {
    if (!categoriaId) return 0;
    return sumTx((t) => filter(t) && t.categoriaId === categoriaId, ["PAGO", "PENDENTE", "VENCIDO"]);
  }

  return stages.map((stage) => {
    const tasks = stage.tasks.map((task) => {
      const orcado = orcadoByTask.get(task.id) ?? 0;
      const realizado = sumTx((t) => t.taskId === task.id, ["PAGO"]);
      const aPagar = sumTx((t) => t.taskId === task.id, ["PENDENTE", "VENCIDO"]);
      const projetado = computeProjetado({ realizado, aPagar });
      const saldo = computeSaldo({ orcado, projetado });
      const maoDeObra = sumTxCategoria((t) => t.taskId === task.id, maoDeObraCategoriaId);
      const material = sumTxCategoria((t) => t.taskId === task.id, materialCategoriaId);
      const avancoFisico = Number(task.percentualExecutado);
      const avancoFinanceiro = computeAvancoFinanceiroPercent({ comprometido: projetado, orcado });
      const { diferenca, status } = computeFisicoFinanceiroStatus({ fisico: avancoFisico, financeiro: avancoFinanceiro });
      return {
        id: task.id,
        codigo: task.codigo,
        nome: task.nome,
        orcado,
        realizado,
        aPagar,
        projetado,
        saldo,
        maoDeObra,
        material,
        avancoFisico,
        avancoFinanceiro,
        diferenca,
        status,
      };
    });

    const orcado = tasks.reduce((sum, t) => sum + t.orcado, 0);
    const realizado = sumTx((t) => t.stageId === stage.id, ["PAGO"]);
    const aPagar = sumTx((t) => t.stageId === stage.id, ["PENDENTE", "VENCIDO"]);
    const projetado = computeProjetado({ realizado, aPagar });
    const saldo = computeSaldo({ orcado, projetado });
    const maoDeObra = sumTxCategoria((t) => t.stageId === stage.id, maoDeObraCategoriaId);
    const material = sumTxCategoria((t) => t.stageId === stage.id, materialCategoriaId);
    const avancoFisico = tasks.length > 0 ? tasks.reduce((sum, t) => sum + t.avancoFisico, 0) / tasks.length : 0;
    const avancoFinanceiro = computeAvancoFinanceiroPercent({ comprometido: projetado, orcado });
    const { diferenca, status } = computeFisicoFinanceiroStatus({ fisico: avancoFisico, financeiro: avancoFinanceiro });

    return {
      id: stage.id,
      codigo: stage.codigo,
      nome: stage.nome,
      orcado,
      realizado,
      aPagar,
      projetado,
      saldo,
      maoDeObra,
      material,
      avancoFisico,
      avancoFinanceiro,
      diferenca,
      status,
      tasks,
    };
  });
}

export async function getWorkCostSummary(workId: string) {
  const work = await prisma.work.findUnique({ where: { id: workId } });
  if (!work) return null;

  const stages = await getBudgetVsActualByStage(workId);

  const orcado = stages.reduce((sum, s) => sum + s.orcado, 0);
  const realizado = stages.reduce((sum, s) => sum + s.realizado, 0);
  const aPagar = stages.reduce((sum, s) => sum + s.aPagar, 0);
  const comprometido = realizado + aPagar;
  const saldoOrcamento = orcado - comprometido;

  const contrato = Number(work.valorContrato);
  const { lucroPrevisto, margemPrevista } = computeMargemPrevista({ contrato, orcado });
  const custoPorM2 = computeCustoPorM2({
    orcado,
    areaConstruida: work.areaConstruida ? Number(work.areaConstruida) : null,
  });

  const custoFinalEstimado = computeCustoFinalEstimado(
    stages.map((s) => ({ orcado: s.orcado, comprometido: s.realizado + s.aPagar })),
  );
  const margemProjetada = computeMargemProjetada({ contrato, custoFinalEstimado });
  const diferencaMargem = margemProjetada - margemPrevista;
  const indicadorMargem = computeMargemIndicador(diferencaMargem);

  const avancoFisico = stages.length > 0 ? stages.reduce((sum, s) => sum + s.avancoFisico, 0) / stages.length : 0;
  const avancoFinanceiro = computeAvancoFinanceiroPercent({ comprometido, orcado });

  return {
    work,
    contrato,
    orcado,
    realizado,
    aPagar,
    comprometido,
    saldoOrcamento,
    lucroPrevisto,
    margemPrevista,
    custoPorM2,
    custoFinalEstimado,
    margemProjetada,
    diferencaMargem,
    indicadorMargem,
    avancoFisico,
    avancoFinanceiro,
    stages,
  };
}

export async function getWorkAlerts(workId: string) {
  const stages = await getBudgetVsActualByStage(workId);
  const alerts = buildStageAlerts(stages);

  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const em7Dias = new Date(hoje);
  em7Dias.setUTCDate(em7Dias.getUTCDate() + 7);

  const [contasVencendoAgg, atrasadas] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: { workId, status: "PENDENTE", dataVencimento: { gte: hoje, lte: em7Dias } },
      _sum: { valor: true },
    }),
    prisma.planningTask.findMany({ where: { workId, status: "ATRASADA" }, select: { nome: true, dataFimPrevista: true } }),
  ]);

  const totalVencendo = Number(contasVencendoAgg._sum.valor ?? 0);
  if (totalVencendo > 0) {
    alerts.push({
      tipo: "warning",
      mensagem: `Existem ${formatCurrencyBRL(totalVencendo)} em contas vencendo nos próximos 7 dias.`,
    });
  }
  for (const task of atrasadas) {
    const diasAtraso = differenceInCalendarDays(hoje, task.dataFimPrevista);
    const sufixo = diasAtraso > 0 ? ` há ${diasAtraso} dia${diasAtraso === 1 ? "" : "s"}` : "";
    alerts.push({ tipo: "danger", mensagem: `${task.nome} está atrasada${sufixo} no cronograma.` });
  }

  return alerts;
}

export async function listBudgetByStage(workId: string) {
  const [stages, budgetItems] = await Promise.all([
    prisma.planningStage.findMany({
      where: { workId },
      include: { tasks: { orderBy: { ordem: "asc" } } },
      orderBy: { ordem: "asc" },
    }),
    prisma.budgetItem.findMany({ where: { workId }, orderBy: { createdAt: "asc" } }),
  ]);

  const itemsByTask = new Map<string, typeof budgetItems>();
  for (const item of budgetItems) {
    const list = itemsByTask.get(item.taskId) ?? [];
    list.push(item);
    itemsByTask.set(item.taskId, list);
  }

  return stages.map((stage) => {
    const tasks = stage.tasks.map((task) => {
      const items = (itemsByTask.get(task.id) ?? []).map((item) => ({
        ...item,
        quantidadePrevista: item.quantidadePrevista ? Number(item.quantidadePrevista) : null,
        valorUnitarioPrevisto: item.valorUnitarioPrevisto ? Number(item.valorUnitarioPrevisto) : null,
        valorTotalPrevisto: Number(item.valorTotalPrevisto),
      }));
      return {
        id: task.id,
        codigo: task.codigo,
        nome: task.nome,
        items,
        totalOrcado: sumBudgetItems(items),
      };
    });
    const totalOrcado = tasks.reduce((sum, t) => sum + t.totalOrcado, 0);
    return { id: stage.id, codigo: stage.codigo, nome: stage.nome, tasks, totalOrcado };
  });
}

export async function createBudgetItem(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const parsed = budgetItemFormSchema.safeParse({
    workId: formData.get("workId"),
    taskId: formData.get("taskId"),
    codigo: formData.get("codigo") ?? undefined,
    descricao: formData.get("descricao") ?? undefined,
    tipoCusto: formData.get("tipoCusto"),
    unidade: formData.get("unidade") ?? undefined,
    quantidadePrevista: formData.get("quantidadePrevista") ?? undefined,
    valorUnitarioPrevisto: formData.get("valorUnitarioPrevisto") ?? undefined,
    valorTotalPrevisto: formData.get("valorTotalPrevisto") ?? undefined,
    observacoes: formData.get("observacoes") ?? undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;

  const valorTotalPrevisto =
    data.quantidadePrevista !== undefined && data.valorUnitarioPrevisto !== undefined
      ? data.quantidadePrevista * data.valorUnitarioPrevisto
      : (data.valorTotalPrevisto ?? 0);

  await prisma.budgetItem.create({
    data: {
      workId: data.workId,
      taskId: data.taskId,
      codigo: data.codigo || null,
      descricao: data.descricao || null,
      tipoCusto: data.tipoCusto,
      unidade: data.unidade,
      quantidadePrevista: data.quantidadePrevista ?? null,
      valorUnitarioPrevisto: data.valorUnitarioPrevisto ?? null,
      valorTotalPrevisto,
      observacoes: data.observacoes || null,
    },
  });

  revalidatePath(`/obras/${data.workId}/orcamento`);
  return undefined;
}

export async function deleteBudgetItem(itemId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.budgetItem.delete({ where: { id: itemId } });
  revalidatePath(`/obras/${workId}/orcamento`);
}
