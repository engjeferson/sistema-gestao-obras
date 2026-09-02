import { listAllUnits } from "@/server/actions/unidades";
import { UnitForm } from "@/components/configuracoes/unit-form";
import { UnitsTable } from "@/components/configuracoes/units-table";

export default async function UnidadesPage() {
  const units = await listAllUnits();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Unidades de medida</h1>
        <p className="text-muted-foreground">Usadas no cadastro de Materiais, itens de Nota Fiscal e Orçamento.</p>
      </div>
      <UnitForm />
      <UnitsTable units={units} />
    </div>
  );
}
