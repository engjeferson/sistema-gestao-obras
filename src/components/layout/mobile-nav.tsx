"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Role } from "@/generated/prisma/enums";

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>
      {open ? (
        <div className="fixed inset-0 top-14 z-50 bg-brand-navy" onClick={() => setOpen(false)}>
          <div className="border-b border-white/10" onClick={(e) => e.stopPropagation()}>
            <SidebarNav role={role} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
