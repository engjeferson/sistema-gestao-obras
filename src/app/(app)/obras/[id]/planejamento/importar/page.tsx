import { BulkPlanningEditor } from "@/components/planejamento/bulk-planning-editor";

export default async function ImportarPlanejamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lançamento em bloco</h1>
        <p className="text-muted-foreground">
          Monte o plano completo — etapas, atividades, datas e predecessoras — e salve tudo de uma vez.
        </p>
      </div>
      <BulkPlanningEditor workId={id} />
    </div>
  );
}
