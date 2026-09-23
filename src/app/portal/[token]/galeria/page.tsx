import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPortalGallery, getPortalStagePhotos } from "@/server/actions/portal";
import { PortalPhotoGallery } from "@/components/portal/portal-photo-gallery";

export const dynamic = "force-dynamic";

export default async function PortalGaleriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ etapa?: string }>;
}) {
  const { token } = await params;
  const { etapa } = await searchParams;

  const data = etapa ? await getPortalStagePhotos(token, etapa) : await getPortalGallery(token);
  if (!data) {
    notFound();
  }

  const titulo = "stageName" in data ? `Fotos — ${data.stageName}` : "Galeria de fotos";
  const subtitulo = "workNome" in data ? data.workNome : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/portal/${token}`}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {subtitulo ? <p className="text-sm text-muted-foreground">{subtitulo}</p> : null}
        {etapa ? (
          <Link href={`/portal/${token}/galeria`} className="text-sm text-primary hover:underline">
            Ver todas as fotos
          </Link>
        ) : null}
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
