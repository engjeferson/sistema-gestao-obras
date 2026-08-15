"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadFileToR2 } from "@/lib/upload-file";
import { compressImage } from "@/lib/compress-image";

export function WorkRenderUploader({
  workId,
  defaultKey,
  defaultPreviewUrl,
}: {
  workId: string;
  defaultKey?: string | null;
  defaultPreviewUrl?: string | null;
}) {
  const [key, setKey] = useState(defaultKey ?? "");
  const [previewUrl, setPreviewUrl] = useState(defaultPreviewUrl ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const uploadedKey = await uploadFileToR2(compressed, "obra-render", workId, workId);
      setKey(uploadedKey);
      setPreviewUrl(URL.createObjectURL(compressed));
      toast.success("Foto enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Foto/render da obra (mostrada no portal do cliente)</Label>
      <input type="hidden" name="renderUrl" value={key} readOnly />
      {previewUrl ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Foto/render da obra" className="h-40 w-64 rounded-md border object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="absolute top-1 right-1"
            onClick={() => {
              setKey("");
              setPreviewUrl("");
            }}
          >
            <X />
          </Button>
        </div>
      ) : null}
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <Camera className="size-4" />
        {uploading ? "Enviando..." : previewUrl ? "Trocar foto" : "Adicionar foto/render"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
