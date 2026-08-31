"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Photo = { url: string; descricao: string | null };

export function PortalPhotoGallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const current = openIndex !== null ? photos[openIndex] : null;

  const goPrev = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);
  const goNext = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, goPrev, goNext]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((foto, index) => (
          <button key={index} type="button" onClick={() => setOpenIndex(index)} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={foto.descricao ?? "Foto da obra"}
              className="aspect-square w-full rounded-md border object-cover transition-opacity hover:opacity-80"
            />
          </button>
        ))}
      </div>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent>
          <DialogTitle className="sr-only">{current?.descricao ?? "Foto da obra"}</DialogTitle>
          {current ? (
            <div className="flex flex-col gap-2">
              <div className="relative flex items-center justify-center">
                {photos.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 z-10"
                    onClick={goPrev}
                  >
                    <ChevronLeft />
                  </Button>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.url}
                  alt={current.descricao ?? "Foto da obra"}
                  className="max-h-[50vh] w-full rounded-md object-contain"
                />
                {photos.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 z-10"
                    onClick={goNext}
                  >
                    <ChevronRight />
                  </Button>
                ) : null}
              </div>
              {current.descricao ? <p className="text-sm text-muted-foreground">{current.descricao}</p> : null}
              {photos.length > 1 ? (
                <p className="text-center text-xs text-muted-foreground">
                  {(openIndex ?? 0) + 1} / {photos.length}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
