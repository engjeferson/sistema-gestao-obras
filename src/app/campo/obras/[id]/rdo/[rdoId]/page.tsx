import { notFound } from "next/navigation";
import { getRdo } from "@/server/actions/rdo";
import { RdoDetailView } from "@/components/rdo/rdo-detail-view";

export default async function CampoRdoDetailPage({
  params,
}: {
  params: Promise<{ id: string; rdoId: string }>;
}) {
  const { id, rdoId } = await params;
  const rdo = await getRdo(rdoId);
  if (!rdo) {
    notFound();
  }

  return <RdoDetailView rdo={rdo} basePath={`/campo/obras/${id}`} />;
}
