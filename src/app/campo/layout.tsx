import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
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
        <div className="flex items-center gap-1">
          <Link
            href="/instalar"
            className="flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            title="Instalar app do RDO"
          >
            <QrCode className="size-4" />
          </Link>
          <LogoutButton className="text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
      </header>
      <main className="flex-1 p-4">
        <InstallAppHint />
        {children}
      </main>
    </div>
  );
}
