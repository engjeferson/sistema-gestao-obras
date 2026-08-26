import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkCalendarForm } from "@/components/obras/work-calendar-form";
import { WorkHolidaysList } from "@/components/obras/work-holidays-list";

export default async function CalendarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const work = await prisma.work.findUnique({
    where: { id },
    select: {
      id: true,
      workingWeekdays: true,
      holidays: { orderBy: { data: "asc" }, select: { id: true, data: true, descricao: true } },
    },
  });
  if (!work) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <WorkCalendarForm workId={work.id} workingWeekdays={work.workingWeekdays} />
      <WorkHolidaysList workId={work.id} holidays={work.holidays} />
    </div>
  );
}
