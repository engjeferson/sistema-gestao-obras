"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/permissions";

export async function toggleWorkingWeekday(workId: string, weekday: number, value: boolean) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const work = await prisma.work.findUniqueOrThrow({ where: { id: workId }, select: { workingWeekdays: true } });
  const next = value
    ? [...new Set([...work.workingWeekdays, weekday])]
    : work.workingWeekdays.filter((d) => d !== weekday);

  await prisma.work.update({ where: { id: workId }, data: { workingWeekdays: next.sort((a, b) => a - b) } });
  revalidatePath(`/obras/${workId}/calendario`);
  revalidatePath(`/obras/${workId}/planejamento`);
}

export async function addWorkHoliday(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  const workId = String(formData.get("workId") ?? "");
  const data = String(formData.get("data") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  if (!workId || !data) return "Informe a data.";

  try {
    await prisma.workHoliday.create({ data: { workId, data: new Date(data), descricao } });
  } catch {
    return "Essa data já está cadastrada.";
  }

  revalidatePath(`/obras/${workId}/calendario`);
  revalidatePath(`/obras/${workId}/planejamento`);
  return undefined;
}

export async function removeWorkHoliday(holidayId: string, workId: string) {
  const session = await auth();
  assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

  await prisma.workHoliday.delete({ where: { id: holidayId } });
  revalidatePath(`/obras/${workId}/calendario`);
  revalidatePath(`/obras/${workId}/planejamento`);
}
