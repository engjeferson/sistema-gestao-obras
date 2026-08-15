import { prisma } from "@/lib/prisma";
import { getEffectiveStatus } from "@/lib/planning";
import { applyCascadeForTask } from "@/server/actions/planejamento";
import type { RdoFormValues } from "@/lib/validations/rdo";

export async function createRdoWithSync(data: RdoFormValues, responsavelId: string) {
  return prisma.$transaction(async (tx) => {
    const lastRdo = await tx.rdo.findFirst({
      where: { workId: data.workId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const numero = (lastRdo?.numero ?? 0) + 1;

    const rdo = await tx.rdo.create({
      data: {
        workId: data.workId,
        numero,
        data: new Date(data.data),
        responsavelId,
        clima: data.clima || null,
        observacoesGerais: data.observacoesGerais || null,
        workers: { create: data.workers.map((w) => ({ funcao: w.funcao, quantidade: w.quantidade })) },
        occurrences: { create: data.occurrences.map((o) => ({ tipo: o.tipo, descricao: o.descricao })) },
        photos: {
          create: data.photos.map((p, index) => ({ url: p.url, descricao: p.descricao || null, ordem: index })),
        },
      },
    });

    for (const activity of data.activities) {
      const planningTask = await tx.planningTask.findUniqueOrThrow({ where: { id: activity.planningTaskId } });
      const percentualAnterior = Number(planningTask.percentualExecutado);

      await tx.rdoActivity.create({
        data: {
          rdoId: rdo.id,
          planningTaskId: activity.planningTaskId,
          descricaoServico: activity.descricaoServico,
          percentualAnterior,
          percentualAtual: activity.percentualAtual,
        },
      });

      const rdoData = new Date(data.data);
      const concluiuAtrasada = activity.percentualAtual >= 100 && rdoData.getTime() > planningTask.dataFimPrevista.getTime();
      const dataFimPrevista = concluiuAtrasada ? rdoData : planningTask.dataFimPrevista;

      const status = getEffectiveStatus({
        percentualExecutado: activity.percentualAtual,
        dataFimPrevista,
      });

      await tx.planningTask.update({
        where: { id: activity.planningTaskId },
        data: { percentualExecutado: activity.percentualAtual, status, dataFimPrevista },
      });

      if (concluiuAtrasada) {
        await applyCascadeForTask(tx, data.workId, activity.planningTaskId);
      }
    }

    return rdo;
  });
}

export async function updateRdoWithSync(rdoId: string, data: RdoFormValues) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.rdo.findUniqueOrThrow({
      where: { id: rdoId },
      include: { activities: true },
    });

    await tx.rdo.update({
      where: { id: rdoId },
      data: {
        data: new Date(data.data),
        clima: data.clima || null,
        observacoesGerais: data.observacoesGerais || null,
      },
    });

    await tx.rdoWorker.deleteMany({ where: { rdoId } });
    if (data.workers.length > 0) {
      await tx.rdoWorker.createMany({
        data: data.workers.map((w) => ({ rdoId, funcao: w.funcao, quantidade: w.quantidade })),
      });
    }

    await tx.rdoOccurrence.deleteMany({ where: { rdoId } });
    if (data.occurrences.length > 0) {
      await tx.rdoOccurrence.createMany({
        data: data.occurrences.map((o) => ({ rdoId, tipo: o.tipo, descricao: o.descricao })),
      });
    }

    await tx.rdoPhoto.deleteMany({ where: { rdoId } });
    if (data.photos.length > 0) {
      await tx.rdoPhoto.createMany({
        data: data.photos.map((p, index) => ({ rdoId, url: p.url, descricao: p.descricao || null, ordem: index })),
      });
    }

    const oldTaskIds = existing.activities.map((a) => a.planningTaskId);
    await tx.rdoActivity.deleteMany({ where: { rdoId } });

    for (const activity of data.activities) {
      const planningTask = await tx.planningTask.findUniqueOrThrow({ where: { id: activity.planningTaskId } });
      await tx.rdoActivity.create({
        data: {
          rdoId,
          planningTaskId: activity.planningTaskId,
          descricaoServico: activity.descricaoServico,
          percentualAnterior: Number(planningTask.percentualExecutado),
          percentualAtual: activity.percentualAtual,
        },
      });
    }

    // Só reflete o percentual na tarefa do Planejamento se esta RDO for a mais
    // recente a mencionar essa tarefa — evita que editar um RDO antigo sobrescreva
    // o progresso já atualizado por um RDO mais novo.
    const newTaskIds = data.activities.map((a) => a.planningTaskId);
    const affectedTaskIds = [...new Set([...oldTaskIds, ...newTaskIds])];

    for (const taskId of affectedTaskIds) {
      const latestActivity = await tx.rdoActivity.findFirst({
        where: { planningTaskId: taskId },
        orderBy: { rdo: { numero: "desc" } },
        include: { rdo: true },
      });
      if (!latestActivity || latestActivity.rdo.id !== rdoId) continue;

      const planningTask = await tx.planningTask.findUniqueOrThrow({ where: { id: taskId } });
      const rdoData = latestActivity.rdo.data;
      const concluiuAtrasada =
        Number(latestActivity.percentualAtual) >= 100 && rdoData.getTime() > planningTask.dataFimPrevista.getTime();
      const dataFimPrevista = concluiuAtrasada ? rdoData : planningTask.dataFimPrevista;

      const status = getEffectiveStatus({
        percentualExecutado: Number(latestActivity.percentualAtual),
        dataFimPrevista,
      });

      await tx.planningTask.update({
        where: { id: taskId },
        data: { percentualExecutado: latestActivity.percentualAtual, status, dataFimPrevista },
      });

      if (concluiuAtrasada) {
        await applyCascadeForTask(tx, existing.workId, taskId);
      }
    }

    return existing;
  });
}
