"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { listStagesWithTasks, type StageTreeNode } from "@/server/actions/planejamento";
import { hasAnyTaskInSubtree, computeWeightedAvanco, type WeightedProgress } from "@/lib/planning";

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Monta a URL do proxy público (/api/portal-files) em vez de assinar direto pro R2 — evita
// depender de CORS do bucket no domínio (que muda a cada preview) pra exibir as fotos.
function portalFileUrl(token: string, key: string) {
  return `/api/portal-files?token=${encodeURIComponent(token)}&key=${encodeURIComponent(key)}`;
}

// Percentuais "folha" (com peso) dentro da subárvore de uma etapa: quando ela mesma funciona como
// "atividade solta" (sem nenhuma tarefa nela ou em qualquer sub dela), conta o percentual da
// própria etapa; senão, agrega o das tarefas diretas + o que vier recursivamente das sub-etapas,
// cada uma com seu peso (impacto) — mesma regra do RDO (`listPlanningTasksForPicker`), aplicada
// aqui pra não zerar o progresso de etapas soltas.
function collectLeafPercentages(stage: StageTreeNode): WeightedProgress[] {
  if (!hasAnyTaskInSubtree(stage)) {
    return [{ percentualExecutado: Number(stage.percentualExecutado), peso: 1 }];
  }
  return [
    ...stage.tasks.map((task) => ({ percentualExecutado: Number(task.percentualExecutado), peso: Number(task.peso) })),
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
      select: { data: true, clima: true, semAtividade: true },
      orderBy: { data: "asc" },
    }),
  ]);

  const percentualExecutado = computeWeightedAvanco(stageTree.flatMap(collectLeafPercentages));

  const etapas = flattenStages(stageTree).map((stage) => ({
    id: stage.id,
    nome: stage.nome,
    percentualExecutado: computeWeightedAvanco(collectLeafPercentages(stage)),
  }));

  const hoje = new Date();
  const diasDecorridos = Math.max(
    0,
    Math.floor((hoje.getTime() - work.dataInicio.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const renderUrl = work.renderUrl ? portalFileUrl(token, work.renderUrl) : null;

  // Agrega por dia — pode haver mais de um RDO na mesma data: mantém o primeiro clima
  // encontrado e marca "sem atividade" se qualquer um dos RDOs daquele dia estiver assim.
  const rdoDaysMap = new Map<string, { clima: string | null; semAtividade: boolean }>();
  for (const r of rdoRows) {
    const dateStr = toDateOnly(r.data);
    const existing = rdoDaysMap.get(dateStr);
    rdoDaysMap.set(dateStr, {
      clima: existing?.clima ?? r.clima,
      semAtividade: (existing?.semAtividade ?? false) || r.semAtividade,
    });
  }

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
    rdoDays: Array.from(rdoDaysMap.entries()).map(([data, info]) => ({ data, ...info })),
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

  return rdos.map((rdo) => ({
    id: rdo.id,
    numero: rdo.numero,
    clima: rdo.clima,
    semAtividade: rdo.semAtividade,
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
    fotos: rdo.photos.map((photo) => ({
      url: portalFileUrl(token, photo.url),
      descricao: photo.descricao,
    })),
  }));
}

// Rota publica — galeria com todas as fotos de todas as RDOs da obra, sem precisar navegar
// dia a dia pelo calendário.
export async function getPortalGallery(token: string) {
  const work = await prisma.work.findUnique({ where: { portalToken: token }, select: { id: true, nome: true } });
  if (!work) return null;

  const photos = await prisma.rdoPhoto.findMany({
    where: { rdo: { workId: work.id } },
    include: { rdo: { select: { data: true, numero: true } } },
    orderBy: [{ rdo: { data: "asc" } }, { ordem: "asc" }],
  });

  const fotos = photos.map((photo) => ({
    url: portalFileUrl(token, photo.url),
    descricao: photo.descricao,
    data: photo.rdo.data,
  }));

  return { workNome: work.nome, fotos };
}

export async function regeneratePortalToken(workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const newToken = randomUUID().replace(/-/g, "");
  await prisma.work.update({ where: { id: workId }, data: { portalToken: newToken } });
  revalidatePath(`/obras/${workId}/visao-geral`);
  return newToken;
}
