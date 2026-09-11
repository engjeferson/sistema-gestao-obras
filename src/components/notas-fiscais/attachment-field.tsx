"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AttachmentField({
  id,
  label,
  accept,
  uploading,
  url,
  onFileChange,
  onRemove,
  helperText,
  className,
}: {
  id: string;
  label: string;
  accept?: string;
  uploading: boolean;
  url: string | null;
  onFileChange: (file: File | undefined) => void;
  onRemove: () => void;
  helperText?: string;
  className?: string;
}) {
  const [resetKey, setResetKey] = useState(0);

  function handleRemove() {
    onRemove();
    setResetKey((k) => k + 1);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          key={resetKey}
          id={id}
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(e) => onFileChange(e.target.files?.[0])}
          className="flex-1"
        />
        {url ? (
          <Button type="button" variant="ghost" size="icon" onClick={handleRemove} title="Remover arquivo">
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      {uploading ? <p className="text-xs text-muted-foreground">Enviando...</p> : null}
      {url ? <p className="text-xs text-success">Arquivo anexado.</p> : null}
    </div>
  );
}
