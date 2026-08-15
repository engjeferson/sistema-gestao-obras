"use client";

import { useState } from "react";
import { List, GanttChartSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageList, type PlainStage, type TaskOption } from "@/components/planejamento/stage-list";
import { GanttChart } from "@/components/gantt/gantt-chart";

export function PlanningView({
  stages,
  workId,
  allTasks,
}: {
  stages: PlainStage[];
  workId: string;
  allTasks: TaskOption[];
}) {
  const [view, setView] = useState<"lista" | "gantt">("lista");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant={view === "lista" ? "default" : "outline"} size="sm" onClick={() => setView("lista")}>
          <List /> Lista
        </Button>
        <Button variant={view === "gantt" ? "default" : "outline"} size="sm" onClick={() => setView("gantt")}>
          <GanttChartSquare /> Gantt
        </Button>
      </div>

      {view === "lista" ? (
        <StageList stages={stages} workId={workId} allTasks={allTasks} />
      ) : (
        <GanttChart stages={stages} workId={workId} allTasks={allTasks} />
      )}
    </div>
  );
}
