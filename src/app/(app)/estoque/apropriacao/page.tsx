import { listWorks } from "@/server/actions/obras";
import { listActiveMaterials } from "@/server/actions/materiais";
import { getStockAppropriationTree } from "@/server/actions/estoque";
import { EstoqueTabsNav } from "@/components/estoque/estoque-tabs-nav";
import { AppropriationObraSelect } from "@/components/estoque/appropriation-obra-select";
import { AppropriationView } from "@/components/estoque/appropriation-view";

export default async function EstoqueApropriacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ workId?: string }>;
}) {
  const { workId } = await searchParams;
  const [works, materials] = await Promise.all([listWorks(), listActiveMaterials()]);
  const nodes = workId ? await getStockAppropriationTree(workId) : [];
  const categorias = Array.from(new Set(materials.map((m) => m.categoria).filter((c): c is string => Boolean(c)))).sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">Apropriação de material por etapa e atividade.</p>
      </div>

      <EstoqueTabsNav />

      <AppropriationObraSelect
        works={works.map((w) => ({ id: w.id, nome: w.nome, codigo: w.codigo }))}
        workId={workId ?? ""}
      />

      {workId ? (
        <AppropriationView
          nodes={nodes}
          materials={materials.map((m) => ({ id: m.id, nome: m.nome }))}
          categorias={categorias}
        />
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Selecione uma obra pra ver a apropriação de material.
        </p>
      )}
    </div>
  );
}
