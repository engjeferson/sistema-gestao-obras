import { Loader2Icon } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2Icon className="size-8 animate-spin" />
      <span className="text-sm">Carregando...</span>
    </div>
  );
}
