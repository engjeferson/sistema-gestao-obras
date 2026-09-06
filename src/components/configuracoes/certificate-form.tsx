"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeCertificate, uploadCertificate } from "@/server/actions/empresa";
import { formatDateBR } from "@/lib/status-labels";

const DIAS_ALERTA_EXPIRACAO = 30;

type CertificateStatus = {
  hasCertificate: boolean;
  arquivoNome: string | null;
  titular: string | null;
  validoAte: Date | null;
  diasParaExpirar: number | null;
  enviadoEm: Date | null;
};

function ExpiryBadge({ diasParaExpirar }: { diasParaExpirar: number | null }) {
  if (diasParaExpirar === null) return null;

  if (diasParaExpirar < 0) {
    return <Badge variant="destructive">Expirado</Badge>;
  }
  if (diasParaExpirar <= DIAS_ALERTA_EXPIRACAO) {
    return <Badge variant="warning">Expira em {diasParaExpirar} dia(s)</Badge>;
  }
  return <Badge variant="success">Válido</Badge>;
}

export function CertificateForm({ status }: { status: CertificateStatus }) {
  const [errorMessage, formAction, isPending] = useActionState(uploadCertificate, undefined);
  const [isRemoving, startRemoveTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    if (!window.confirm("Remover o certificado digital cadastrado?")) return;
    startRemoveTransition(async () => {
      await removeCertificate();
      toast.success("Certificado removido.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold">Certificado digital A1 (Radar de NF-e)</h3>
        <p className="text-sm text-muted-foreground">
          Usado para autenticar junto à SEFAZ e buscar automaticamente as notas fiscais de compra
          emitidas contra o CNPJ da empresa. O arquivo e a senha ficam criptografados no banco —
          ninguém além do sistema consegue lê-los.
        </p>
      </div>

      {status.hasCertificate ? (
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Arquivo:</span>
            {status.arquivoNome}
            <ExpiryBadge diasParaExpirar={status.diasParaExpirar} />
          </div>
          <p>
            <span className="text-muted-foreground">Titular: </span>
            {status.titular}
          </p>
          <p>
            <span className="text-muted-foreground">Válido até: </span>
            {status.validoAte ? formatDateBR(status.validoAte) : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Enviado em: </span>
            {status.enviadoEm ? formatDateBR(status.enviadoEm) : "—"}
          </p>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 w-fit text-destructive hover:text-destructive"
            disabled={isRemoving}
            onClick={handleRemove}
          >
            {isRemoving ? "Removendo..." : "Remover certificado"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-warning">Nenhum certificado cadastrado ainda.</p>
      )}

      <form action={formAction} className="flex flex-col gap-3 border-t pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="certificado">Arquivo (.pfx ou .p12)</Label>
            <Input id="certificado" name="certificado" type="file" accept=".pfx,.p12" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Senha do certificado</Label>
            <Input id="senha" name="senha" type="password" required />
          </div>
        </div>

        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enviando..." : status.hasCertificate ? "Substituir certificado" : "Enviar certificado"}
          </Button>
        </div>
      </form>
    </div>
  );
}
