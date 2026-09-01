"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstalarBotao() {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    setIsAndroid(/android/i.test(window.navigator.userAgent));

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (isStandalone) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-brand-teal/30 bg-brand-teal/10 p-3 text-sm font-medium text-brand-teal-deep">
        <CheckCircle2 className="size-4" /> App já instalado neste celular
      </div>
    );
  }

  if (isAndroid && installEvent) {
    return (
      <Button type="button" size="lg" className="w-full" onClick={handleClick}>
        <Download /> Instalar app agora
      </Button>
    );
  }

  return null;
}
