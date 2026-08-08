import Link from "next/link";
import { Plus } from "lucide-react";
import { listRdos } from "@/server/actions/rdo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateBR } from "@/lib/status-labels";

export default async function CampoRdoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rdos = await listRdos(id);

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" className="w-full" render={<Link href={`/campo/obras/${id}/rdo/novo`} />} nativeButton={false}>
        <Plus /> Novo RDO
      </Button>

      {rdos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Nenhum RDO lançado ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rdos.map((rdo) => (
            <Link key={rdo.id} href={`/campo/obras/${id}/rdo/${rdo.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">RDO #{rdo.numero}</p>
                    <p className="text-sm text-muted-foreground">{formatDateBR(rdo.data)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
