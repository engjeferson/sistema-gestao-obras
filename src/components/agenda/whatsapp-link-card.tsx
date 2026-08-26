"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatTelefone } from "@/lib/masks";
import { linkMyWhatsAppAccount, unlinkMyWhatsAppAccount } from "@/server/actions/whatsapp-conta";

export function WhatsAppLinkCard({ telefone }: { telefone: string | null }) {
  const [errorMessage, formAction, isPending] = useActionState(linkMyWhatsAppAccount, undefined);
  const [isUnlinking, startUnlink] = useTransition();
  const router = useRouter();

  function unlink() {
    if (!confirm("Desvincular esse número? Mensagens desse WhatsApp deixarão de criar compromissos.")) return;
    startUnlink(async () => {
      await unlinkMyWhatsAppAccount();
      toast.success("WhatsApp desvinculado.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4" /> Agendar pelo WhatsApp
        </CardTitle>
        <CardDescription>
          Vincule seu número e mande mensagens como &quot;reunião com o cliente sexta às 14h&quot; para criar
          compromissos automaticamente. Responda a uma confirmação para cancelar ou remarcar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {telefone ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{formatTelefone(telefone.replace(/^55/, ""))}</span>
            <Button type="button" variant="outline" size="sm" disabled={isUnlinking} onClick={unlink}>
              {isUnlinking ? "Removendo..." : "Desvincular"}
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Input name="telefone" placeholder="(11) 99999-9999" required />
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
