import { AlertTriangle, OctagonAlert, CircleCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetAlert } from "@/lib/budget";

export function AlertsList({ alerts }: { alerts: BudgetAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-success" />
            Nenhum alerta no momento.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((alert, index) => (
              <li
                key={index}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  alert.tipo === "danger"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/15 text-warning-foreground dark:text-warning"
                }`}
              >
                {alert.tipo === "danger" ? (
                  <OctagonAlert className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                )}
                <span>{alert.mensagem}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
