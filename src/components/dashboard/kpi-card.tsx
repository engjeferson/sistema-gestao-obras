import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "destructive" | "warning";

const TONE_STYLES: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
  href?: string;
}) {
  const card = (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="flex items-center gap-3 pt-6">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/card:scale-110",
            TONE_STYLES[tone],
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs text-muted-foreground">{label}</span>
          <span className="text-lg font-heading font-semibold tracking-tight">{value}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}
