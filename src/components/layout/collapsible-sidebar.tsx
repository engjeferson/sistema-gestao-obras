"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

const STORAGE_KEY = "sidebar-collapsed";

export function CollapsibleSidebar({ role }: { role: Role }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setCollapsed(true);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-brand-navy transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        {collapsed ? (
          <span className="flex size-8 items-center justify-center rounded-md bg-white/10 text-sm font-bold text-brand-teal">
            R
          </span>
        ) : (
          <Image
            src="/brand/reis-logo-white.png"
            alt="Reis Engenharia"
            width={160}
            height={74}
            className="h-9 w-auto"
            priority
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav role={role} collapsed={collapsed} />
      </div>

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed ? "Recolher" : null}
        </button>
      </div>
    </aside>
  );
}
