import { listPlanningTasksForPicker, createRdo } from "@/server/actions/rdo";
import { prisma } from "@/lib/prisma";
import { RdoForm } from "@/components/rdo/rdo-form";

export default async function NovoRdoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [stages, lastRdo] = await Promise.all([
    listPlanningTasksForPicker(id),
    prisma.rdo.findFirst({ where: { workId: id }, orderBy: { numero: "desc" }, select: { numero: true } }),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo RDO</h1>
      </div>
      <RdoForm action={createRdo} workId={id} stages={stages} numero={(lastRdo?.numero ?? 0) + 1} />
    </div>
  );
}
