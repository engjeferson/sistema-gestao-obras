"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <Button variant="ghost" size="icon" onClick={() => logout()} title="Sair" className={cn(className)}>
      <LogOut className="size-4" />
    </Button>
  );
}
