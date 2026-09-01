import imageCompression from "browser-image-compression";

const MAX_SIZE_MB = 0.5;
const MAX_DIMENSION = 1600;

// Redimensiona/recomprime fotos antes do upload (fotos de câmera de celular
// costumam vir com vários MB e resoluções muito acima do que a tela mostra).
// A biblioteca itera a qualidade até caber em MAX_SIZE_MB, mantendo a melhor
// qualidade possível dentro desse limite.
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }
  if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_DIMENSION,
      initialQuality: 0.8,
      useWebWorker: true,
    });
    return compressed.size < file.size ? compressed : file;
  } catch {
    // Formato que o navegador não consegue decodificar (ex: alguns HEIC) — envia o original.
    return file;
  }
}
