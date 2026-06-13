// Cliente: compresión de imágenes vía canvas. Solo navegador.
// Devuelve un File JPEG/WebP redimensionado si supera los umbrales.

export type CompressOptions = {
  maxBytes?: number; // umbral a partir del cual comprimir
  maxDimension?: number; // lado máximo (px)
  quality?: number; // 0..1
  mimeType?: "image/jpeg" | "image/webp";
};

export async function maybeCompressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<{ file: File; compressed: boolean; originalSize: number; finalSize: number }> {
  const maxBytes = opts.maxBytes ?? 3 * 1024 * 1024; // 3 MB
  const maxDim = opts.maxDimension ?? 2048;
  const quality = opts.quality ?? 0.82;
  const mime = opts.mimeType ?? "image/jpeg";
  const originalSize = file.size;

  if (typeof window === "undefined") return { file, compressed: false, originalSize, finalSize: originalSize };
  if (file.size <= maxBytes && !/gif$/i.test(file.type)) {
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }
  // Los GIF se dejan intactos (canvas perdería animación). Si pesa > maxBytes y es gif, devolvemos tal cual.
  if (/gif$/i.test(file.type)) {
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, compressed: false, originalSize, finalSize: originalSize };
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), mime, quality),
    );
    if (blob.size >= file.size) {
      return { file, compressed: false, originalSize, finalSize: originalSize };
    }
    const ext = mime === "image/webp" ? "webp" : "jpg";
    const newName = file.name.replace(/\.[a-z0-9]+$/i, "") + `.${ext}`;
    const out = new File([blob], newName, { type: mime, lastModified: Date.now() });
    return { file: out, compressed: true, originalSize, finalSize: out.size };
  } catch {
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }
}
