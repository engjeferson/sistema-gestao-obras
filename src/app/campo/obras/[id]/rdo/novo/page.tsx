import { listPlanningTasksForPicker, createRdo } from "@/server/actions/rdo";
import { prisma } from "@/lib/prisma";
import { RdoForm } from "@/components/rdo/rdo-form";

export default async function CampoNovoRdoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [stages, lastRdo] = await Promise.all([
    listPlanningTasksForPicker(id),
    prisma.rdo.findFirst({ where: { workId: id }, orderBy: { numero: "desc" }, select: { numero: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Novo RDO</h1>
      <RdoForm action={createRdo} workId={id} stages={stages} numero={(lastRdo?.numero ?? 0) + 1} />
    </div>
  );
}
