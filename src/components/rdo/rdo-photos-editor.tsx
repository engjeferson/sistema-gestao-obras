"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFileToR2 } from "@/lib/upload-file";
import { compressImage } from "@/lib/compress-image";
import type { RdoPhotoValues } from "@/lib/validations/rdo";

export function RdoPhotosEditor({
  photos,
  onChange,
  workId,
  draftId,
}: {
  photos: RdoPhotoValues[];
  onChange: (photos: RdoPhotoValues[]) => void;
  workId: string;
  draftId: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: RdoPhotoValues[] = [];
    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file);
        const key = await uploadFileToR2(compressed, "rdo-fotos", workId, draftId);
        uploaded.push({ url: key, descricao: "" });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "";
        toast.error(`Não foi possível enviar ${file.name}.${detail ? ` (${detail})` : ""}`);
      }
    }
    if (uploaded.length > 0) {
      onChange([...photos, ...uploaded]);
      toast.success(`${uploaded.length} foto(s) enviada(s).`);
    }
    setUploading(false);
  }

  function updateDescricao(index: number, descricao: string) {
    onChange(photos.map((p, i) => (i === index ? { ...p, descricao } : p)));
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <Camera className="size-4" />
        {uploading ? "Enviando..." : "Adicionar fotos"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>
      {photos.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md border p-2">
              <span className="flex-1 truncate text-xs text-muted-foreground">{photo.url.split("/").pop()}</span>
              <Input
                placeholder="Descrição (opcional)"
                value={photo.descricao ?? ""}
                onChange={(e) => updateDescricao(index, e.target.value)}
                className="max-w-40"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(photos.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
