"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";
import { assertModuleWrite } from "@/server/actions/permissions";
import { rdoFormSchema } from "@/lib/validations/rdo";
import { createRdoWithSync, updateRdoWithSync } from "@/server/services/rdo-sync";

export async function listRdos(workId: string) {
  return prisma.rdo.findMany({
    where: { workId },
    include: { responsavel: true },
    orderBy: { numero: "desc" },
  });
}

export async function getRdo(rdoId: string) {
  return prisma.rdo.findUnique({
    where: { id: rdoId },
    include: {
      work: true,
      responsavel: true,
      workers: true,
      occurrences: true,
      photos: { orderBy: { ordem: "asc" } },
      activities: { include: { planningTask: { include: { stage: true } } } },
    },
  });
}

export async function listPlanningTasksForPicker(workId: string) {
  const stages = await prisma.planningStage.findMany({
    where: { workId },
    include: { tasks: { orderBy: { ordem: "asc" } } },
    orderBy: { ordem: "asc" },
  });
  return stages.map((stage) => ({
    id: stage.id,
    nome: stage.nome,
    tasks: stage.tasks.map((task) => ({
      id: task.id,
      nome: task.nome,
      percentualExecutado: Number(task.percentualExecutado),
    })),
  }));
}

function parseJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export async function createRdo(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "OBRA"]);
  await assertModuleWrite("rdoSomenteLeitura");

  const parsed = rdoFormSchema.safeParse({
    workId: formData.get("workId"),
    data: formData.get("data"),
    clima: formData.get("clima") ?? undefined,
    observacoesGerais: formData.get("observacoesGerais") ?? undefined,
    workers: parseJsonField(formData, "workersJson", []),
    activities: parseJsonField(formData, "activitiesJson", []),
    occurrences: parseJsonField(formData, "occurrencesJson", []),
    photos: parseJsonField(formData, "photosJson", []),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }

  const rdo = await createRdoWithSync(parsed.data, session.user.id);

  revalidatePath(`/obras/${parsed.data.workId}/rdo`);
  revalidatePath(`/obras/${parsed.data.workId}/planejamento`);
  revalidatePath(`/obras/${parsed.data.workId}/visao-geral`);
  revalidatePath(`/campo/obras/${parsed.data.workId}/rdo`);

  const basePath = session.user.role === "OBRA" ? "/campo/obras" : "/obras";
  redirect(`${basePath}/${parsed.data.workId}/rdo/${rdo.id}`);
}

export async function updateRdo(rdoId: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO", "OBRA"]);
  await assertModuleWrite("rdoSomenteLeitura");

  const parsed = rdoFormSchema.safeParse({
    workId: formData.get("workId"),
    data: formData.get("data"),
    clima: formData.get("clima") ?? undefined,
    observacoesGerais: formData.get("observacoesGerais") ?? undefined,
    workers: parseJsonField(formData, "workersJson", []),
    activities: parseJsonField(formData, "activitiesJson", []),
    occurrences: parseJsonField(formData, "occurrencesJson", []),
    photos: parseJsonField(formData, "photosJson", []),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }

  await updateRdoWithSync(rdoId, parsed.data);

  revalidatePath(`/obras/${parsed.data.workId}/rdo`);
  revalidatePath(`/obras/${parsed.data.workId}/rdo/${rdoId}`);
  revalidatePath(`/obras/${parsed.data.workId}/planejamento`);
  revalidatePath(`/obras/${parsed.data.workId}/visao-geral`);
  revalidatePath(`/campo/obras/${parsed.data.workId}/rdo`);
  revalidatePath(`/campo/obras/${parsed.data.workId}/rdo/${rdoId}`);

  const basePath = session.user.role === "OBRA" ? "/campo/obras" : "/obras";
  redirect(`${basePath}/${parsed.data.workId}/rdo/${rdoId}`);
}
