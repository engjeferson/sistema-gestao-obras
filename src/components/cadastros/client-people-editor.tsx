"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientPersonValues } from "@/lib/validations/clientes";

export function ClientPeopleEditor({
  people,
  onChange,
}: {
  people: ClientPersonValues[];
  onChange: (people: ClientPersonValues[]) => void;
}) {
  function update(index: number, patch: Partial<ClientPersonValues>) {
    onChange(people.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div className="flex flex-col gap-3">
      {people.map((person, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            {index === 0 ? <Label htmlFor={`pessoa-nome-${index}`}>Nome</Label> : null}
            <Input
              id={`pessoa-nome-${index}`}
              placeholder="Nome completo"
              value={person.nome}
              onChange={(e) => update(index, { nome: e.target.value })}
            />
          </div>
          <div className="flex w-40 flex-col gap-2">
            {index === 0 ? <Label htmlFor={`pessoa-nasc-${index}`}>Aniversário</Label> : null}
            <Input
              id={`pessoa-nasc-${index}`}
              type="date"
              value={person.dataAniversario ?? ""}
              onChange={(e) => update(index, { dataAniversario: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={people.length <= 1}
            onClick={() => onChange(people.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...people, { nome: "", dataAniversario: undefined }])}
      >
        <Plus /> Adicionar pessoa
      </Button>
      <p className="text-xs text-muted-foreground">
        Adicione mais de uma pessoa quando a obra for de um casal — os dois nomes vão aparecer juntos onde o cliente
        é exibido.
      </p>
    </div>
  );
}
