"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "campo-install-hint-dismissed";

type Platform = "ios" | "android" | null;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppHint() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    if (!isIOS && !isAndroid) return;

    setPlatform(isIOS ? "ios" : "android");
    setDismissed(false);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setDismissed(true);
    }
    setInstallEvent(null);
  }

  if (dismissed || !platform) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand-teal/30 bg-brand-teal/10 p-3">
      <SquarePlus className="mt-0.5 size-5 shrink-0 text-brand-teal-deep" />
      <div className="flex-1 text-sm">
        {platform === "android" && installEvent ? (
          <>
            <p className="font-medium text-foreground">Instale o app do RDO neste celular</p>
            <p className="mt-0.5 text-muted-foreground">Acesso rápido, direto na tela de início, sem precisar abrir o navegador.</p>
            <Button type="button" size="sm" className="mt-2" onClick={handleInstallClick}>
              <Download /> Instalar app
            </Button>
          </>
        ) : platform === "ios" ? (
          <>
            <p className="font-medium text-foreground">Instale o app do RDO neste celular</p>
            <p className="mt-0.5 text-muted-foreground">
              Toque em <Share className="inline size-3.5 align-text-bottom" /> Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-foreground">Instale o app do RDO neste celular</p>
            <p className="mt-0.5 text-muted-foreground">Use o menu do navegador e toque em &quot;Adicionar à tela inicial&quot;.</p>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Dispensar">
        <X className="size-4" />
      </button>
    </div>
  );
}
