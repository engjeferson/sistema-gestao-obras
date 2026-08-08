import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

export function StockLocationFilter({
  works,
  selected,
}: {
  works: { id: string; nome: string; codigo: string }[];
  selected: string;
}) {
  return (
    <form className="flex max-w-sm items-end gap-2">
      <div className="flex flex-1 flex-col gap-2">
        <NativeSelect name="local" defaultValue={selected}>
          <option value="">Estoque Geral</option>
          {works.map((work) => (
            <option key={work.id} value={work.id}>
              {work.codigo} — {work.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="outline" size="sm">
        Ver
      </Button>
    </form>
  );
}
