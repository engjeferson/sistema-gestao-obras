"use client";

import { Sun, Cloud, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";

const CLIMA_OPTIONS = [
  { value: "Ensolarado", label: "Ensolarado", icon: Sun },
  { value: "Nublado", label: "Nublado", icon: Cloud },
  { value: "Chuva", label: "Chuva", icon: CloudRain },
];

export function ClimaPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex gap-2">
      {CLIMA_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(isSelected ? "" : option.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-6" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
