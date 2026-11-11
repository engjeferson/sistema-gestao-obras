"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertRole, assertWorkAccess, ForbiddenError } from "@/lib/permissions";
import { getCurrentWorkAccess } from "@/server/actions/permissions";

export async function toggleWorkingWeekday(workId: string, weekday: number, value: boolean): Promise<string | undefined> {
  try {
    const session = await auth();
    assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
    assertWorkAccess(await getCurrentWorkAccess(), workId);

    const work = await prisma.work.findUniqueOrThrow({ where: { id: workId }, select: { workingWeekdays: true } });
    const next = value
      ? [...new Set([...work.workingWeekdays, weekday])]
      : work.workingWeekdays.filter((d) => d !== weekday);

    await prisma.work.update({ where: { id: workId }, data: { workingWeekdays: next.sort((a, b) => a - b) } });
    revalidatePath(`/obras/${workId}/calendario`);
    revalidatePath(`/obras/${workId}/planejamento`);
    return undefined;
  } catch (err) {
    if (err instanceof ForbiddenError) return err.message;
    throw err;
  }
}

export async function addWorkHoliday(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  const workId = String(formData.get("workId") ?? "");
  const data = String(formData.get("data") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  try {
    assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);
    if (!workId || !data) return "Informe a data.";
    assertWorkAccess(await getCurrentWorkAccess(), workId);
  } catch (err) {
    if (err instanceof ForbiddenError) return err.message;
    throw err;
  }

  try {
    await prisma.workHoliday.create({ data: { workId, data: new Date(data), descricao } });
  } catch {
    return "Essa data já está cadastrada.";
  }

  revalidatePath(`/obras/${workId}/calendario`);
  revalidatePath(`/obras/${workId}/planejamento`);
  return undefined;
}

export async function removeWorkHoliday(holidayId: string, workId: string): Promise<string | undefined> {
  try {
    const session = await auth();
    assertRole(session, ["ADMINISTRADOR", "ENGENHEIRO"]);

    const holiday = await prisma.workHoliday.findUnique({ where: { id: holidayId }, select: { workId: true } });
    if (!holiday) {
      return "Feriado não encontrado.";
    }
    assertWorkAccess(await getCurrentWorkAccess(), holiday.workId);

    await prisma.workHoliday.delete({ where: { id: holidayId } });
    revalidatePath(`/obras/${workId}/calendario`);
    revalidatePath(`/obras/${workId}/planejamento`);
    return undefined;
  } catch (err) {
    if (err instanceof ForbiddenError) return err.message;
    throw err;
  }
}
