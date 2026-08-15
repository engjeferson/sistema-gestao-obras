import Image from "next/image";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="flex h-16 items-center justify-center bg-brand-navy px-4">
        <Image
          src="/brand/reis-logo-white.png"
          alt="Reis Engenharia"
          width={140}
          height={65}
          className="h-8 w-auto"
          priority
        />
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">{children}</main>
    </div>
  );
}
