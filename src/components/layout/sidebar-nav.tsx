"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  FileText,
  Settings,
  Contact,
  BarChart3,
  Boxes,
  Smartphone,
  LayoutTemplate,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] };

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"] },
      {
        href: "/agenda",
        label: "Agenda",
        icon: CalendarDays,
        roles: ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO", "OBRA"],
      },
    ],
  },
  {
    label: "Obras",
    items: [
      { href: "/obras", label: "Obras", icon: Building2, roles: ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"] },
      { href: "/estoque", label: "Estoque", icon: Boxes, roles: ["ADMINISTRADOR", "ENGENHEIRO"] },
      { href: "/campo/obras", label: "Campo (RDO mobile)", icon: Smartphone, roles: ["ADMINISTRADOR", "ENGENHEIRO"] },
      {
        href: "/planejamento-templates",
        label: "Templates de planejamento",
        icon: LayoutTemplate,
        roles: ["ADMINISTRADOR", "ENGENHEIRO"],
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: Wallet, roles: ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"] },
      { href: "/notas-fiscais", label: "Notas Fiscais", icon: FileText, roles: ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"] },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/cadastros", label: "Cadastros", icon: Contact, roles: ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"] },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["ADMINISTRADOR", "ENGENHEIRO", "FINANCEIRO"] },
    ],
  },
  {
    label: "Sistema",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings, roles: ["ADMINISTRADOR"] }],
  },
];

export function SidebarNav({
  role,
  collapsed = false,
  onNavigate,
}: {
  role: Role;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-4 p-3">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label && !collapsed ? (
            <span className="px-3 pt-1 pb-0.5 text-[0.6875rem] font-semibold tracking-wide text-white/40 uppercase">
              {group.label}
            </span>
          ) : null}
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-brand-teal/15 text-brand-teal"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {isActive ? (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-teal" aria-hidden />
                ) : null}
                <Icon className="size-4 shrink-0" />
                {collapsed ? (
                  <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-brand-navy-light px-2 py-1 text-xs text-white shadow-lg ring-1 ring-white/10 group-hover:block">
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
