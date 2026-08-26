"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateBR } from "@/lib/status-labels";
import { addWorkHoliday, removeWorkHoliday } from "@/server/actions/work-calendar";

export type WorkHolidayRow = { id: string; data: Date; descricao: string | null };

export function WorkHolidaysList({ workId, holidays }: { workId: string; holidays: WorkHolidayRow[] }) {
  const [errorMessage, formAction, isPending] = useActionState(addWorkHoliday, undefined);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Feriados / dias não trabalhados</h2>
        <p className="text-sm text-muted-foreground">
          Datas específicas excluídas do cálculo de dias úteis (feriados, paralisações), além dos dias da semana acima.
        </p>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-2">
          <Input type="date" name="data" required className="w-40" />
        </div>
        <div className="flex flex-1 min-w-[160px] flex-col gap-2">
          <Input name="descricao" placeholder="Descrição (opcional)" />
        </div>
        <input type="hidden" name="workId" value={workId} />
        <Button type="submit" disabled={isPending}>
          <Plus /> Adicionar
        </Button>
      </form>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum feriado cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {holidays.map((h) => (
            <HolidayRow key={h.id} holiday={h} workId={workId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HolidayRow({ holiday, workId }: { holiday: WorkHolidayRow; workId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <li className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
      <span>
        {formatDateBR(holiday.data)}
        {holiday.descricao ? <span className="text-muted-foreground"> — {holiday.descricao}</span> : null}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeWorkHoliday(holiday.id, workId);
            router.refresh();
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
