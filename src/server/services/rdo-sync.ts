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
