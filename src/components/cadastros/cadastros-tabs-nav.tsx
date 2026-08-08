"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "clientes", label: "Clientes" },
  { slug: "fornecedores", label: "Fornecedores" },
  { slug: "materiais", label: "Materiais" },
  { slug: "profissionais", label: "Profissionais" },
  { slug: "contas-bancarias", label: "Contas Bancárias" },
];

export function CadastrosTabsNav() {
  const pathname = usePathname();

  return (
    <div className="w-fit max-w-full overflow-x-auto rounded-lg bg-muted p-1">
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const href = `/cadastros/${tab.slug}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
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
