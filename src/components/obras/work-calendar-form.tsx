"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toggleWorkingWeekday } from "@/server/actions/work-calendar";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function WorkCalendarForm({ workId, workingWeekdays }: { workId: string; workingWeekdays: number[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(weekday: number, checked: boolean) {
    startTransition(async () => {
      await toggleWorkingWeekday(workId, weekday, checked);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Dias úteis</h2>
        <p className="text-sm text-muted-foreground">
          Dias da semana considerados trabalhados — usados no cálculo de duração e no encadeamento de predecessoras.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        {WEEKDAYS.map((day) => {
          const isWorking = workingWeekdays.includes(day.value);
          return (
            <label key={day.value} className="flex items-center gap-2">
              <Checkbox
                checked={isWorking}
                disabled={isPending}
                onCheckedChange={(checked) => handleToggle(day.value, checked === true)}
              />
              <Label className={cn("font-normal", !isWorking && "text-muted-foreground")}>{day.label}</Label>
            </label>
          );
        })}
      </div>
    </div>
  );
}
