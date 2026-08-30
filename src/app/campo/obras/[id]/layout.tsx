import { notFound } from "next/navigation";
import { getWork } from "@/server/actions/obras";
import { getCurrentWorkAccess } from "@/server/actions/permissions";
import { canAccessWork } from "@/lib/work-access";

export default async function CampoObraLayout({
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

  return children;
}
