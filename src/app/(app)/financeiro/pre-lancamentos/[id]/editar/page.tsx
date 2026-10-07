import { notFound } from "next/navigation";
import { listWorks } from "@/server/actions/obras";
import { listFinancialCategories } from "@/server/actions/financeiro";
import { listStagesForAllWorks } from "@/server/actions/planejamento";
import { listSuppliers } from "@/server/actions/fornecedores";
import { listClients } from "@/server/actions/clientes";
import { listActiveMaterials } from "@/server/actions/materiais";
import { listActiveUnits } from "@/server/actions/unidades";
import { getPreLancamento, updatePreLancamento } from "@/server/actions/pre-lancamentos";
import { PreLancamentoForm } from "@/components/financeiro/pre-lancamento-form";
import type { InvoiceItemValues } from "@/lib/validations/notas-fiscais";

export default async function EditarPreLancamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [preLancamento, works, categorias, stagesByWork, suppliers, clients, materials, units] = await Promise.all([
    getPreLancamento(id),
    listWorks(),
    listFinancialCategories(),
    listStagesForAllWorks(),
    listSuppliers(),
    listClients(),
    listActiveMaterials(),
    listActiveUnits(),
  ]);

  if (!preLancamento) {
    notFound();
  }

  const worksOptions = works.map((work) => ({ id: work.id, nome: work.nome, codigo: work.codigo }));
  const favorecidosOptions = [...new Set([...suppliers.map((s) => s.nome), ...clients.map((c) => c.nome)])];
  const materialsOptions = materials.map((m) => ({
    nome: m.nome,
    unidadePadrao: m.unidadePadrao,
    precoUnitario: m.precoUnitario !== null ? Number(m.precoUnitario) : null,
  }));
  const itens = Array.isArray(preLancamento.itensJson)
    ? (preLancamento.itensJson as unknown as InvoiceItemValues[])
    : undefined;
  const modo = itens && itens.length > 0 ? "pedido_nf" : "simples";
  const updatePreLancamentoWithId = updatePreLancamento.bind(null, preLancamento.id);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisar pré-lançamento</h1>
        <p className="text-muted-foreground">Complete os dados antes de aprovar — categoria, fornecedor/cliente e vencimento são obrigatórios pra aprovar.</p>
      </div>
      <PreLancamentoForm
        action={updatePreLancamentoWithId}
        works={worksOptions}
        categorias={categorias}
        stagesByWork={stagesByWork}
        favorecidosOptions={favorecidosOptions}
        materials={materialsOptions}
        units={units}
        modo={modo}
        submitLabel="Salvar alterações"
        defaultValues={{
          workId: preLancamento.workId ?? undefined,
          stageId: preLancamento.stageId ?? undefined,
          tipo: preLancamento.tipo,
          descricao: preLancamento.descricao,
          categoriaId: preLancamento.categoriaId ?? undefined,
          favorecidoNome: preLancamento.favorecidoNome ?? undefined,
          valor: Number(preLancamento.valor),
          dataVencimento: preLancamento.dataVencimento?.toISOString().slice(0, 10),
          observacao: preLancamento.observacao ?? undefined,
          numeroDocumento: preLancamento.numeroDocumento ?? undefined,
          itens,
          valorFrete: preLancamento.valorFrete !== null ? Number(preLancamento.valorFrete) : undefined,
          valorDesconto: preLancamento.valorDesconto !== null ? Number(preLancamento.valorDesconto) : undefined,
          attachments: preLancamento.attachments.map((a) => ({ url: a.url, nome: a.nome })),
        }}
      />
    </div>
  );
}
