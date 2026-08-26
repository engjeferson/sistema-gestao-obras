"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { agendaEventFormSchema } from "@/lib/validations/agenda";

const SAO_PAULO_OFFSET = "-03:00";

function combineDateTime(data: string, hora: string | undefined, diaTodo: boolean) {
  const time = diaTodo ? "00:00" : (hora ?? "00:00");
  return new Date(`${data}T${time}:00${SAO_PAULO_OFFSET}`);
}

export async function listAgendaEvents(range: { start: Date; end: Date }) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  return prisma.agendaEvent.findMany({
    where: {
      createdById: session.user.id,
      inicio: { gte: range.start, lt: range.end },
    },
    include: {
      work: { select: { id: true, nome: true, codigo: true } },
      client: { select: { id: true, nome: true } },
    },
    orderBy: { inicio: "asc" },
  });
}

export async function getAgendaEvent(id: string) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  const event = await prisma.agendaEvent.findUnique({ where: { id } });
  if (!event || event.createdById !== session.user.id) {
    return null;
  }
  return event;
}

function parseAgendaForm(formData: FormData) {
  return agendaEventFormSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") ?? undefined,
    local: formData.get("local") ?? undefined,
    data: formData.get("data"),
    hora: formData.get("hora") ?? undefined,
    horaFim: formData.get("horaFim") ?? undefined,
    diaTodo: formData.get("diaTodo") === "on",
    workId: formData.get("workId") ?? undefined,
    clientId: formData.get("clientId") ?? undefined,
  });
}

export async function createAgendaEvent(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  const parsed = parseAgendaForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const diaTodo = data.diaTodo ?? false;

  await prisma.agendaEvent.create({
    data: {
      titulo: data.titulo,
      descricao: data.descricao || null,
      local: data.local || null,
      inicio: combineDateTime(data.data, data.hora, diaTodo),
      fim: !diaTodo && data.horaFim ? combineDateTime(data.data, data.horaFim, false) : null,
      diaTodo,
      origem: "MANUAL",
      status: "CONFIRMADO",
      workId: data.workId || null,
      clientId: data.clientId || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function updateAgendaEvent(id: string, _prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  const existing = await prisma.agendaEvent.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    throw new ForbiddenError("Compromisso não encontrado.");
  }

  const parsed = parseAgendaForm(formData);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dados inválidos.";
  }
  const data = parsed.data;
  const diaTodo = data.diaTodo ?? false;

  await prisma.agendaEvent.update({
    where: { id },
    data: {
      titulo: data.titulo,
      descricao: data.descricao || null,
      local: data.local || null,
      inicio: combineDateTime(data.data, data.hora, diaTodo),
      fim: !diaTodo && data.horaFim ? combineDateTime(data.data, data.horaFim, false) : null,
      diaTodo,
      workId: data.workId || null,
      clientId: data.clientId || null,
      lembreteEnviadoEm: null,
    },
  });

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function setAgendaEventStatus(id: string, status: "CONFIRMADO" | "CANCELADO") {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  const existing = await prisma.agendaEvent.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    throw new ForbiddenError("Compromisso não encontrado.");
  }

  await prisma.agendaEvent.update({ where: { id }, data: { status } });
  revalidatePath("/agenda");
}

export async function deleteAgendaEvent(id: string) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Sessão não encontrada.");

  const existing = await prisma.agendaEvent.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    throw new ForbiddenError("Compromisso não encontrado.");
  }

  await prisma.agendaEvent.delete({ where: { id } });
  revalidatePath("/agenda");
}
