"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Photo = { id: string; url: string; descricao: string | null };

export function RdoPhotosGallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const current = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="flex flex-col gap-1 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files?key=${encodeURIComponent(photo.url)}`}
              alt={photo.descricao ?? "Foto do RDO"}
              className="aspect-square w-full rounded-md border object-cover transition-opacity hover:opacity-80"
            />
            {photo.descricao ? (
              <p className="truncate text-xs text-muted-foreground">{photo.descricao}</p>
            ) : null}
          </button>
        ))}
      </div>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogTitle className="sr-only">{current?.descricao ?? "Foto do RDO"}</DialogTitle>
          {current ? (
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files?key=${encodeURIComponent(current.url)}`}
                alt={current.descricao ?? "Foto do RDO"}
                className="max-h-[80vh] w-full rounded-md object-contain"
              />
              {current.descricao ? <p className="text-sm text-muted-foreground">{current.descricao}</p> : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
