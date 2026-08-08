import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CollapsibleSidebar } from "@/components/layout/collapsible-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "OBRA") {
    redirect("/campo/obras");
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <CollapsibleSidebar role={session.user.role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2">
            <MobileNav role={session.user.role} />
            <Image
              src="/brand/reis-logo-color.png"
              alt="Reis Engenharia"
              width={140}
              height={65}
              className="h-7 w-auto md:hidden"
            />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={session.user.name ?? session.user.email ?? "Usuário"} role={session.user.role} />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
