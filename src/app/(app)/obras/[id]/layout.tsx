import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getWork } from "@/server/actions/obras";
import { getCurrentWorkAccess } from "@/server/actions/permissions";
import { canAccessWork } from "@/lib/work-access";
import { ObraTabsNav } from "@/components/obras/obra-tabs-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WORK_STATUS_BADGE, WORK_STATUS_LABELS } from "@/lib/status-labels";

export default async function ObraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [work, workAccess] = await Promise.all([getWork(id), getCurrentWorkAccess()]);
  if (!work || !canAccessWork(workAccess, id)) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{work.nome}</h1>
            <Badge variant={WORK_STATUS_BADGE[work.status]}>{WORK_STATUS_LABELS[work.status]}</Badge>
          </div>
          <p className="text-muted-foreground">
            {work.codigo}
            {work.client ? ` · ${work.client.nome}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href={`/obras/${work.id}/editar`} />} nativeButton={false}>
          <Pencil /> Editar
        </Button>
      </div>
      <ObraTabsNav workId={work.id} />
      {children}
    </div>
  );
}
