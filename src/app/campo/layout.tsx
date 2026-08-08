import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function CampoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between bg-brand-navy px-4">
        <Image src="/brand/reis-logo-white.png" alt="Reis Engenharia" width={140} height={65} className="h-8 w-auto" priority />
        <LogoutButton className="text-white/70 hover:bg-white/10 hover:text-white" />
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
