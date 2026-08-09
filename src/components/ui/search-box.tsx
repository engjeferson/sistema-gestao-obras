"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox({
  value,
  onChange,
  placeholder,
  resultCount,
  totalCount,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {value ? (
        <p className="text-xs text-muted-foreground">
          {resultCount} de {totalCount}
        </p>
      ) : null}
    </div>
  );
}
