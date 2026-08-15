import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/logout-button";
import { InstallAppHint } from "@/components/campo/install-app-hint";

export default async function CampoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between bg-brand-navy px-4">
        <div className="flex items-center gap-3">
          {session.user.role !== "OBRA" ? (
            <Link href="/obras" className="text-white/70 hover:text-white" title="Voltar ao sistema">
              <ArrowLeft className="size-5" />
            </Link>
          ) : null}
          <Image src="/brand/reis-logo-white.png" alt="Reis Engenharia" width={140} height={65} className="h-8 w-auto" priority />
        </div>
        <LogoutButton className="text-white/70 hover:bg-white/10 hover:text-white" />
      </header>
      <main className="flex-1 p-4">
        <InstallAppHint />
        {children}
      </main>
    </div>
  );
}
