import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 -mt-4 flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Link href="/campo/obras" className="flex items-center gap-1.5 text-sm font-medium hover:text-primary">
          <ArrowLeft className="size-4" />
          Minhas Obras
        </Link>
        <span className="truncate text-xs text-muted-foreground">
          {work.codigo} · {work.nome}
        </span>
      </div>
      {children}
    </div>
  );
}
