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
    const fileList = Array.from(files);
    // Compacta e envia todas as fotos em paralelo em vez de uma por vez — numa obra
    // com sinal fraco, mandar 4-5 fotos em sequência multiplicava o tempo de espera.
    const results = await Promise.allSettled(
      fileList.map(async (file) => {
        const compressed = await compressImage(file);
        const key = await uploadFileToR2(compressed, "rdo-fotos", workId, draftId);
        return { url: key, descricao: "" } satisfies RdoPhotoValues;
      }),
    );

    const uploaded: RdoPhotoValues[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        uploaded.push(result.value);
      } else {
        const detail = result.reason instanceof Error ? result.reason.message : "";
        toast.error(`Não foi possível enviar ${fileList[index].name}.${detail ? ` (${detail})` : ""}`);
      }
    });

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
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>
      {photos.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-md border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files?key=${encodeURIComponent(photo.url)}`}
                alt={photo.descricao || "Foto adicionada"}
                className="aspect-video w-full rounded-md border object-cover"
              />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Descrição (opcional)"
                  value={photo.descricao ?? ""}
                  onChange={(e) => updateDescricao(index, e.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => onChange(photos.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
