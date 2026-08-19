"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Routes that manage their own edge-to-edge padding (sticky headers/footers
// that need to bleed flush to main's edge — impossible if main itself has padding,
// since position:sticky clamps to the scroll container's padding edge regardless of margin).
const NO_PADDING_ROUTES = ["/financeiro", "/notas-fiscais", "/notas-fiscais/radar"];

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noPadding = NO_PADDING_ROUTES.includes(pathname);

  return (
    <main
      className={cn(
        "flex-1 overflow-x-hidden overflow-y-auto [overflow-anchor:none]",
        noPadding ? "" : "p-4 md:p-6",
      )}
    >
      {children}
    </main>
  );
}
