import Link from "next/link";
import { FileText, Receipt } from "lucide-react";
import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";
import { listActiveMaterials } from "@/server/actions/materiais";
import { listActiveUnits } from "@/server/actions/unidades";
import { listActiveBankAccounts } from "@/server/actions/contas-bancarias";
import { createPreLancamento } from "@/server/actions/pre-lancamentos";
import { PreLancamentoForm } from "@/components/financeiro/pre-lancamento-form";
import { cn } from "@/lib/utils";

export default async function NovoPreLancamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const { modo: modoParam } = await searchParams;
  const modo = modoParam === "pedido_nf" ? "pedido_nf" : "simples";

  const [works, categorias, stagesByWork, suppliers, clients, materials, units, bankAccounts] = await Promise.all([
    listWorks(),
    listFinancialCategories(),
    listStagesForAllWorks(),
    listSuppliers(),
    listClients(),
    listActiveMaterials(),
    listActiveUnits(),
    listActiveBankAccounts(),
  ]);
  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const favorecidosOptions = [...new Set([...suppliers.map((s) => s.nome), ...clients.map((c) => c.nome)])];
  const materialsOptions = materials.map((m) => ({
    nome: m.nome,
    unidadePadrao: m.unidadePadrao,
    precoUnitario: m.precoUnitario !== null ? Number(m.precoUnitario) : null,
  }));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo pré-lançamento</h1>
        <p className="text-muted-foreground">
          Fica pendente de revisão — só vira conta de verdade no Financeiro quando você aprovar.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/financeiro/pre-lancamentos/novo?modo=simples"
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
            modo === "simples" ? "border-primary bg-primary/5" : "hover:bg-muted",
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <FileText className="size-4" /> Lançamento simples
          </span>
          <span className="text-xs text-muted-foreground">Uma despesa ou receita, com um valor único.</span>
        </Link>
        <Link
          href="/financeiro/pre-lancamentos/novo?modo=pedido_nf"
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
            modo === "pedido_nf" ? "border-primary bg-primary/5" : "hover:bg-muted",
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <Receipt className="size-4" /> Pedido / Nota Fiscal
          </span>
          <span className="text-xs text-muted-foreground">
            Compra de material com itens — gera entrada no Estoque ao aprovar.
          </span>
        </Link>
      </div>

      <PreLancamentoForm
        key={modo}
        action={createPreLancamento}
        works={worksOptions}
        categorias={categorias}
        stagesByWork={stagesByWork}
        favorecidosOptions={favorecidosOptions}
        materials={materialsOptions}
        units={units}
        bankAccounts={bankAccounts}
        modo={modo}
        submitLabel="Criar pré-lançamento"
        origem="MANUAL"
      />
    </div>
  );
}
