import { notFound } from "next/navigation";
import { getPlanningTemplateForEdit, updatePlanningTemplate } from "@/server/actions/planejamento-templates";
import { TemplatePlanningEditor, type TemplateRow } from "@/components/planejamento/template-planning-editor";

export default async function EditarPlanningTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getPlanningTemplateForEdit(id);
  if (!template) {
    notFound();
  }

  const defaultRows: TemplateRow[] = template.rows.map((row) => ({
    clientId: row.clientId,
    tipo: row.tipo,
    parentClientId: row.parentClientId ?? "",
    codigo: row.codigo,
    nome: row.nome,
    offsetInicioDias: row.offsetInicioDias?.toString() ?? "",
    duracaoDias: row.duracaoDias?.toString() ?? "",
    predecessorClientIds: row.predecessorClientIds,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar template de planejamento</h1>
        <p className="text-muted-foreground">
          As datas são relativas ao início da obra — informe o dia de início de cada atividade (dia 0 = início da
          obra) e a duração em dias.
        </p>
      </div>
      <TemplatePlanningEditor
        action={updatePlanningTemplate.bind(null, id)}
        submitLabel="Salvar alterações"
        defaultNome={template.nome}
        defaultDescricao={template.descricao ?? ""}
        defaultRows={defaultRows}
      />
    </div>
  );
}
