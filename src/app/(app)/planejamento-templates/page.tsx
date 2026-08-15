import Link from "next/link";
import { Plus } from "lucide-react";
import { listPlanningTemplates } from "@/server/actions/planejamento-templates";
import { PlanningTemplatesTable } from "@/components/planejamento/planning-templates-table";
import { Button } from "@/components/ui/button";

export default async function PlanningTemplatesPage() {
  const templates = await listPlanningTemplates();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates de planejamento</h1>
          <p className="text-muted-foreground">
            Reaproveite cronogramas prontos em obras novas, sem lançar etapa por etapa do zero.
          </p>
        </div>
        <Button render={<Link href="/planejamento-templates/novo" />} nativeButton={false}>
          <Plus /> Novo template
        </Button>
      </div>
      <PlanningTemplatesTable templates={templates} />
    </div>
  );
}
