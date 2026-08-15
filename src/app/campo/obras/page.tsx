import Link from "next/link";
import { listWorks } from "@/server/actions/obras";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WORK_STATUS_ACCENT, WORK_STATUS_BADGE, WORK_STATUS_LABELS } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

export default async function CampoObrasPage() {
  const works = await listWorks();
  const obrasAtivas = works.filter((w) => w.status !== "CONCLUIDA");

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold tracking-tight">Minhas Obras</h1>
      <div className="flex flex-col gap-2">
        {obrasAtivas.map((work) => (
          <Link key={work.id} href={`/campo/obras/${work.id}/rdo`}>
            <Card
              className={cn(
                "border-l-4 shadow-sm transition-shadow hover:shadow-md",
                WORK_STATUS_ACCENT[work.status],
              )}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{work.nome}</p>
                  <p className="text-sm text-muted-foreground">{work.codigo}</p>
                </div>
                <Badge variant={WORK_STATUS_BADGE[work.status]}>{WORK_STATUS_LABELS[work.status]}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
