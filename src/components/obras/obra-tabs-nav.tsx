"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "visao-geral", label: "Visão Geral" },
  { slug: "financeiro", label: "Financeiro" },
  { slug: "materiais", label: "Materiais/NFs" },
  { slug: "planejamento", label: "Planejamento" },
  { slug: "orcamento", label: "Orçamento" },
  { slug: "rdo", label: "RDO" },
  { slug: "contratos", label: "Contratos" },
];

export function ObraTabsNav({ workId }: { workId: string }) {
  const pathname = usePathname();

  return (
    <div className="w-fit max-w-full overflow-x-auto rounded-full bg-muted p-1">
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const href = `/obras/${workId}/${tab.slug}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
