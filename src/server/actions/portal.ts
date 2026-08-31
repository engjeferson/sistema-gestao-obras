"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { presignGet } from "@/lib/r2";

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Rota publica (sem autenticacao) — nunca retornar dado financeiro aqui.
export async function getPortalData(token: string) {
  const work = await prisma.work.findUnique({
    where: { portalToken: token },
    select: {
      id: true,
      nome: true,
      codigo: true,
      status: true,
      renderUrl: true,
      dataInicio: true,
      dataPrevistaTermino: true,
      client: { select: { nome: true } },
    },
  });
  if (!work) return null;

  const [stages, rdoRows] = await Promise.all([
    prisma.planningStage.findMany({
      where: { workId: work.id },
      include: { tasks: { select: { percentualExecutado: true } } },
      orderBy: { ordem: "asc" },
    }),
    prisma.rdo.findMany({
      where: { workId: work.id },
      select: { data: true },
      orderBy: { data: "asc" },
    }),
  ]);

  const percentualExecutado = average(
    stages.flatMap((stage) => stage.tasks.map((task) => Number(task.percentualExecutado))),
  );

  const etapas = stages.map((stage) => ({
    id: stage.id,
    nome: stage.nome,
    percentualExecutado: average(stage.tasks.map((task) => Number(task.percentualExecutado))),
  }));

  const hoje = new Date();
  const diasDecorridos = Math.max(
    0,
    Math.floor((hoje.getTime() - work.dataInicio.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const renderUrl = work.renderUrl ? await presignGet(work.renderUrl, 3600) : null;

  return {
    nome: work.nome,
    codigo: work.codigo,
    status: work.status,
    clienteNome: work.client?.nome ?? null,
    renderUrl,
    dataInicio: work.dataInicio,
    dataPrevistaTermino: work.dataPrevistaTermino,
    diasDecorridos,
    percentualExecutado,
    etapas,
    rdoDates: [...new Set(rdoRows.map((r) => toDateOnly(r.data)))],
  };
}

// Rota publica — chamada quando o cliente clica num dia do calendario.
export async function getPortalDayDetails(token: string, dateStr: string) {
  const work = await prisma.work.findUnique({ where: { portalToken: token }, select: { id: true } });
  if (!work) return [];

  const rdos = await prisma.rdo.findMany({
    where: { workId: work.id, data: new Date(`${dateStr}T00:00:00.000Z`) },
    include: {
      photos: { orderBy: { ordem: "asc" } },
      activities: { include: { planningTask: { include: { stage: true } }, planningStage: true } },
    },
  });

  return Promise.all(
    rdos.map(async (rdo) => ({
      id: rdo.id,
      numero: rdo.numero,
      clima: rdo.clima,
      observacoesGerais: rdo.observacoesGerais,
      atividades: rdo.activities.map((activity) => ({
        etapaNome: activity.planningTask ? activity.planningTask.stage.nome : (activity.planningStage?.nome ?? ""),
        atividadeNome: activity.planningTask ? activity.planningTask.nome : "(etapa completa)",
        percentualAtual: Number(activity.percentualAtual),
      })),
      fotos: await Promise.all(
        rdo.photos.map(async (photo) => ({
          url: await presignGet(photo.url, 3600),
          descricao: photo.descricao,
        })),
      ),
    })),
  );
}

export async function regeneratePortalToken(workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const newToken = randomUUID().replace(/-/g, "");
  await prisma.work.update({ where: { id: workId }, data: { portalToken: newToken } });
  revalidatePath(`/obras/${workId}/visao-geral`);
  return newToken;
}
