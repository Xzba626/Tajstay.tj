const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type CompressOptions = {
  maxEdge?: number;
  quality?: number;
  maxBytes?: number;
};

/**
 * Downscale and re-encode photos before multipart upload (mobile camera files are often 3–8 MB each).
 */
export async function compressImageFileForUpload(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.82;
  const maxBytes = opts.maxBytes ?? 1_200_000;

  if (!ACCEPT_TYPES.has(file.type)) return file;
  if (file.size <= maxBytes && file.type === "image/webp") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
