"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { presignGet } from "@/lib/r2";
import { listStagesWithTasks, type StageTreeNode } from "@/server/actions/planejamento";
import { hasAnyTaskInSubtree } from "@/lib/planning";

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Percentuais "folha" dentro da subárvore de uma etapa: quando ela mesma funciona como "atividade
// solta" (sem nenhuma tarefa nela ou em qualquer sub dela), conta o percentual da própria etapa;
// senão, agrega o das tarefas diretas + o que vier recursivamente das sub-etapas. Mesma regra do
// RDO (`listPlanningTasksForPicker`), aplicada aqui pra não zerar o progresso de etapas soltas.
function collectLeafPercentages(stage: StageTreeNode): number[] {
  if (!hasAnyTaskInSubtree(stage)) {
    return [Number(stage.percentualExecutado)];
  }
  return [
    ...stage.tasks.map((task) => Number(task.percentualExecutado)),
    ...stage.children.flatMap(collectLeafPercentages),
  ];
}

function flattenStages(nodes: StageTreeNode[]): StageTreeNode[] {
  return nodes.flatMap((stage) => [stage, ...flattenStages(stage.children)]);
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

  const [stageTree, rdoRows] = await Promise.all([
    listStagesWithTasks(work.id),
    prisma.rdo.findMany({
      where: { workId: work.id },
      select: { data: true },
      orderBy: { data: "asc" },
    }),
  ]);

  const percentualExecutado = average(stageTree.flatMap(collectLeafPercentages));

  const etapas = flattenStages(stageTree).map((stage) => ({
    id: stage.id,
    nome: stage.nome,
    percentualExecutado: average(collectLeafPercentages(stage)),
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
const OCCURRENCE_LABELS: Record<string, string> = {
  PROBLEMA: "Problema",
  ATRASO: "Atraso",
  FALTA_MATERIAL: "Falta de material",
  ALTERACAO: "Alteração",
  VISITA: "Visita",
  OBSERVACAO: "Observação",
};

export async function getPortalDayDetails(token: string, dateStr: string) {
  const work = await prisma.work.findUnique({ where: { portalToken: token }, select: { id: true } });
  if (!work) return [];

  const rdos = await prisma.rdo.findMany({
    where: { workId: work.id, data: new Date(`${dateStr}T00:00:00.000Z`) },
    include: {
      photos: { orderBy: { ordem: "asc" } },
      occurrences: true,
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
        atividadeNome: activity.planningTask
          ? `${activity.planningTask.stage.nome} — ${activity.planningTask.nome}`
          : (activity.planningStage?.nome ?? ""),
        descricaoServico: activity.descricaoServico,
        percentualAtual: Number(activity.percentualAtual),
      })),
      ocorrencias: rdo.occurrences.map((o) => ({
        tipoLabel: OCCURRENCE_LABELS[o.tipo] ?? o.tipo,
        descricao: o.descricao,
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
