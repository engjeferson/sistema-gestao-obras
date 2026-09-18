import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPortalGallery } from "@/server/actions/portal";
import { PortalPhotoGallery } from "@/components/portal/portal-photo-gallery";

export const dynamic = "force-dynamic";

export default async function PortalGaleriaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPortalGallery(token);
  if (!data) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/portal/${token}`} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Galeria de fotos</h1>
        <p className="text-sm text-muted-foreground">{data.workNome}</p>
      </div>

      {data.fotos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Nenhuma foto anexada ainda.
        </p>
      ) : (
        <PortalPhotoGallery photos={data.fotos} />
      )}
    </div>
  );
}
