"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function InvoicesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [fornecedor, setFornecedor] = useState(searchParams.get("fornecedor") ?? "");

  useEffect(() => {
    setFornecedor(searchParams.get("fornecedor") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get("fornecedor") ?? "";
      if (fornecedor === current) return;
      const params = new URLSearchParams(searchParams.toString());
      if (fornecedor.trim()) {
        params.set("fornecedor", fornecedor.trim());
      } else {
        params.delete("fornecedor");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fornecedor]);

  return (
    <div className="relative mb-4 max-w-sm">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={fornecedor}
        onChange={(e) => setFornecedor(e.target.value)}
        placeholder="Buscar por fornecedor..."
        className="pl-9"
      />
    </div>
  );
}
