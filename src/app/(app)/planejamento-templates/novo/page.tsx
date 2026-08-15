import { TemplatePlanningEditor } from "@/components/planejamento/template-planning-editor";

export default function NovoPlanningTemplatePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo template de planejamento</h1>
        <p className="text-muted-foreground">
          As datas são relativas ao início da obra — informe o dia de início de cada atividade (dia 0 = início da
          obra) e a duração em dias.
        </p>
      </div>
      <TemplatePlanningEditor />
    </div>
  );
}
