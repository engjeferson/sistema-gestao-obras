import Link from "next/link";
import { listActiveWorksWithProgress } from "@/server/actions/obras";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WORK_STATUS_ACCENT, WORK_STATUS_BADGE, WORK_STATUS_LABELS } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

export default async function CampoObrasPage() {
  const obrasAtivas = await listActiveWorksWithProgress();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold tracking-tight">Minhas Obras</h1>
      <div className="flex flex-col gap-2">
        {obrasAtivas.map((work) => {
          const percent = Math.min(100, Math.max(0, work.percentualExecutado));
          return (
            <Link key={work.id} href={`/campo/obras/${work.id}/rdo`}>
              <Card
                className={cn(
                  "border-l-4 shadow-sm transition-shadow hover:shadow-md",
                  WORK_STATUS_ACCENT[work.status],
                )}
              >
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{work.nome}</p>
                      <p className="text-sm text-muted-foreground">{work.codigo}</p>
                    </div>
                    <Badge variant={WORK_STATUS_BADGE[work.status]}>{WORK_STATUS_LABELS[work.status]}</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{percent.toFixed(0)}% executado</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
