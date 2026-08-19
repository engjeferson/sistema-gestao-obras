"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function PaginationControls({
  page,
  totalPages,
  pageSize,
}: {
  page: number;
  totalPages: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1 && !pageSize) return null;

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  function changePageSize(newPageSize: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", newPageSize);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </p>
        {pageSize ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">·</span>
            <NativeSelect
              value={String(pageSize)}
              onChange={(e) => changePageSize(e.target.value)}
              className="h-8 w-auto text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} por página
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>
      {totalPages > 1 ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            <ChevronLeft /> Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
            Próxima <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
