"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import type { AgendaEventModel } from "@/generated/prisma/models";

type AgendaEventFormProps = {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  works: { id: string; nome: string; codigo: string }[];
  clients: { id: string; nome: string }[];
  defaultValues?: AgendaEventModel;
  submitLabel: string;
};

function toDateInputValue(date: Date | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function toTimeInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function AgendaEventForm({ action, works, clients, defaultValues, submitLabel }: AgendaEventFormProps) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [diaTodo, setDiaTodo] = useState(defaultValues?.diaTodo ?? false);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" name="titulo" defaultValue={defaultValues?.titulo} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" defaultValue={toDateInputValue(defaultValues?.inicio)} required />
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="diaTodo"
              checked={diaTodo}
              onChange={(e) => setDiaTodo(e.target.checked)}
              className="size-4"
            />
            Dia inteiro
          </label>
        </div>

        {!diaTodo ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hora">Horário</Label>
              <Input id="hora" name="hora" type="time" defaultValue={toTimeInputValue(defaultValues?.inicio)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="horaFim">Horário de término</Label>
              <Input id="horaFim" name="horaFim" type="time" defaultValue={toTimeInputValue(defaultValues?.fim)} />
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="local">Local</Label>
          <Input id="local" name="local" defaultValue={defaultValues?.local ?? ""} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="workId">Obra</Label>
          <NativeSelect id="workId" name="workId" defaultValue={defaultValues?.workId ?? ""}>
            <option value="">—</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.codigo} — {work.nome}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="clientId">Cliente</Label>
          <NativeSelect id="clientId" name="clientId" defaultValue={defaultValues?.clientId ?? ""}>
            <option value="">—</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.nome}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" name="descricao" defaultValue={defaultValues?.descricao ?? ""} />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
