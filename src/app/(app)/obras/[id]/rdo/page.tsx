import Link from "next/link";
import { Plus, Smartphone } from "lucide-react";
import { listRdos } from "@/server/actions/rdo";
import { getCurrentModulePermissions } from "@/server/actions/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateBR } from "@/lib/status-labels";

export default async function RdoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rdos, modulePermissions] = await Promise.all([listRdos(id), getCurrentModulePermissions()]);
  const canEdit = !modulePermissions.rdoSomenteLeitura;

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/campo/obras/${id}/rdo/novo`} />}
            nativeButton={false}
          >
            <Smartphone /> Preencher no celular
          </Button>
          <Button size="sm" render={<Link href={`/obras/${id}/rdo/novo`} />} nativeButton={false}>
            <Plus /> Novo RDO
          </Button>
        </div>
      ) : null}

      {rdos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhum RDO lançado ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rdos.map((rdo) => (
            <Link key={rdo.id} href={`/obras/${id}/rdo/${rdo.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">RDO #{rdo.numero}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateBR(rdo.data)} · {rdo.responsavel.name}
                    </p>
                  </div>
                  {rdo.clima ? <span className="text-sm text-muted-foreground">{rdo.clima}</span> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
