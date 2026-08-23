"use client";

import { useRouter, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function AppropriationObraSelect({
  works,
  workId,
}: {
  works: { id: string; nome: string; codigo: string }[];
  workId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="apropriacao-obra">Selecionar obra</Label>
      <NativeSelect
        id="apropriacao-obra"
        className="w-auto"
        value={workId}
        onChange={(e) => router.push(e.target.value ? `${pathname}?workId=${e.target.value}` : pathname)}
      >
        <option value="">Selecione a obra</option>
        {works.map((work) => (
          <option key={work.id} value={work.id}>
            {work.codigo} — {work.nome}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
