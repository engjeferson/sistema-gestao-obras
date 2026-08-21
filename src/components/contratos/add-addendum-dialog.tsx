"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContractAddendum } from "@/server/actions/contratos";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AddAddendumDialog({ contractId, workId }: { contractId: string; workId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [errorMessage, formAction, isPending] = useActionState(createContractAddendum, undefined);
  const [submittedOnce, setSubmittedOnce] = useState(false);

  useEffect(() => {
    if (submittedOnce && !isPending && !errorMessage) {
      setOpen(false);
      setSubmittedOnce(false);
      router.refresh();
    }
  }, [submittedOnce, isPending, errorMessage, router]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Novo aditivo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo aditivo</DialogTitle>
          </DialogHeader>

          <form
            action={(formData) => {
              setSubmittedOnce(true);
              formAction(formData);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="contractId" value={contractId} />
            <input type="hidden" name="workId" value={workId} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="valor">Valor do aditivo</Label>
              <CurrencyInput id="valor" name="valor" required />
              <p className="text-xs text-muted-foreground">Esse valor soma ao valor total do contrato.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={todayStr()} required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input id="descricao" name="descricao" placeholder="Ex: Serviço adicional de acabamento" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea id="observacoes" name="observacoes" />
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Adicionar aditivo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
