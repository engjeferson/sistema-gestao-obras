"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { regeneratePortalToken } from "@/server/actions/portal";

export function PortalShareCard({ workId, portalToken }: { workId: string; portalToken: string }) {
  const [token, setToken] = useState(portalToken);
  const [copied, setCopied] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const path = `/portal/${token}`;

  function handleCopy() {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRegenerateClick() {
    if (!confirmingRegenerate) {
      setConfirmingRegenerate(true);
      return;
    }
    startTransition(async () => {
      const newToken = await regeneratePortalToken(workId);
      setToken(newToken);
      setConfirmingRegenerate(false);
      toast.success("Novo link gerado. O link antigo parou de funcionar.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal do cliente</CardTitle>
        <CardDescription>
          Link público com o andamento da obra (fotos e etapas) — sem nenhuma informação financeira.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">{path}</code>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar link"}
        </Button>
        <Button
          type="button"
          variant={confirmingRegenerate ? "destructive" : "ghost"}
          size="sm"
          onClick={handleRegenerateClick}
          disabled={isPending}
        >
          <RefreshCw className={isPending ? "animate-spin" : ""} />
          {confirmingRegenerate ? "Confirmar? O link atual para de funcionar" : "Gerar novo link"}
        </Button>
      </CardContent>
    </Card>
  );
}
