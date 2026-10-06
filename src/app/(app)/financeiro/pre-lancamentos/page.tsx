import Link from "next/link";
import { Plus, Sparkles, PenLine } from "lucide-react";
import { listPreLancamentos, countPreLancamentosByStatus } from "@/server/actions/pre-lancamentos";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PreLancamentosTable } from "@/components/financeiro/pre-lancamentos-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PreLancamentoStatus } from "@/generated/prisma/enums";

const TABS: { status: PreLancamentoStatus; label: string }[] = [
  { status: "PENDENTE", label: "Pendentes" },
  { status: "RECUSADO", label: "Recusados" },
  { status: "FINALIZADO", label: "Finalizados" },
];

export default async function PreLancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const status: PreLancamentoStatus =
    statusParam === "RECUSADO" || statusParam === "FINALIZADO" ? statusParam : "PENDENTE";
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const [result, counts] = await Promise.all([listPreLancamentos(status, page), countPreLancamentosByStatus()]);

  const items = result.items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    dataVencimento: item.dataVencimento,
    descricao: item.descricao,
    tipo: item.tipo,
    valor: Number(item.valor),
    favorecidoNome: item.favorecidoNome,
    origem: item.origem,
    motivoRecusa: item.motivoRecusa,
    work: item.work ? { nome: item.work.nome, codigo: item.work.codigo } : null,
    categoria: item.categoria ? { nome: item.categoria.nome } : null,
    attachments: item.attachments.map((a) => ({ url: a.url, nome: a.nome })),
    qtdItens: Array.isArray(item.itensJson) ? item.itensJson.length : 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pré-lançamentos</h1>
          <p className="text-muted-foreground">Revise e aprove lançamentos criados manualmente ou extraídos por IA.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button>
                <Plus /> Novo pré-lançamento
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/financeiro/pre-lancamentos/novo" />}>
              <PenLine /> Manual
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/financeiro/pre-lancamentos/nova-ia" />}>
              <Sparkles /> Via IA (colar texto ou anexar foto)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-fit max-w-full overflow-x-auto rounded-full bg-muted p-1">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.status}
              href={`/financeiro/pre-lancamentos?status=${tab.status}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                status === tab.status
                  ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label} ({counts[tab.status]})
            </Link>
          ))}
        </div>
      </div>

      <PreLancamentosTable items={items} status={status} />
      <PaginationControls page={result.page} totalPages={result.totalPages} />
    </div>
  );
}
