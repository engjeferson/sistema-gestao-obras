import Link from "next/link";
import { CalendarDays, HardHat, MoreVertical, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WORK_STATUS_BADGE, WORK_STATUS_LABELS, formatCurrencyBRL, formatDateBR } from "@/lib/status-labels";
import { getInitials } from "@/lib/text";
import type { ObraDashboardRow } from "@/server/actions/obras";

function PersonMini({ label, person }: { label: string; person: { nome: string } | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
          {person ? getInitials(person.nome) : "—"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        <p className="truncate text-xs leading-tight font-medium">{person?.nome ?? "não atribuído"}</p>
      </div>
    </div>
  );
}

export function ObraCard({ obra }: { obra: ObraDashboardRow }) {
  const percent = Math.min(100, Math.max(0, obra.percentualExecutado));
  const saudePositiva = obra.saudeFinanceira >= 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <PersonMini label="Responsável técnico" person={obra.responsavelTecnico} />
          <PersonMini label="Encarregado" person={obra.encarregado} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Link href={`/obras/${obra.id}`} className="truncate font-heading text-base font-semibold hover:text-primary">
              {obra.nome}
            </Link>
            <Badge variant={WORK_STATUS_BADGE[obra.status]}>{WORK_STATUS_LABELS[obra.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{obra.codigo}</p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{percent.toFixed(2)}% executada</span>
            <span>{obra.diasDecorridos} dias decorridos</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saúde financeira</span>
            <span className={saudePositiva ? "font-medium text-success" : "font-medium text-destructive"}>
              {formatCurrencyBRL(obra.saudeFinanceira)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Custo total da obra</span>
            <span>{formatCurrencyBRL(obra.custoTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarDays className="size-3.5" /> Previsão de entrega
            </span>
            <span>{formatDateBR(obra.dataPrevistaTermino)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <HardHat className="size-3.5" /> Atividades atrasadas
            </span>
            <span className={obra.atividadesAtrasadas > 0 ? "font-medium text-destructive" : ""}>
              {obra.atividadesAtrasadas}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="size-3.5" /> Efetivos na obra
            </span>
            <span>{obra.efetivosNaObra}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className="flex-1" size="sm" render={<Link href={`/obras/${obra.id}`} />} nativeButton={false}>
            Acessar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon-sm">
                  <MoreVertical />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/obras/${obra.id}/editar`} />}>Editar obra</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
