import { notFound } from "next/navigation";
import { getRdo } from "@/server/actions/rdo";
import { getCurrentModulePermissions } from "@/server/actions/permissions";
import { RdoDetailView } from "@/components/rdo/rdo-detail-view";

export default async function RdoDetailPage({
  params,
}: {
  params: Promise<{ id: string; rdoId: string }>;
}) {
  const { id, rdoId } = await params;
  const [rdo, modulePermissions] = await Promise.all([getRdo(rdoId), getCurrentModulePermissions()]);
  if (!rdo) {
    notFound();
  }

  return <RdoDetailView rdo={rdo} basePath={`/obras/${id}`} canEdit={!modulePermissions.rdoSomenteLeitura} />;
}
