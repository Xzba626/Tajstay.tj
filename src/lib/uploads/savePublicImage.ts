import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB per image
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export type UploadSubdir = "hotel-covers" | "room-photos";

/**
 * Сохраняет изображение в public/uploads/{subdir}/ и возвращает путь вида /uploads/...
 * На некоторых production-хостингах файловая система read-only; в этом случае
 * возвращаем data URL, чтобы форма не падала и фото всё равно отображалось.
 */
export async function savePublicImageFile(file: File, subdir: UploadSubdir): Promise<string | null> {
  if (!file || file.size <= 0 || file.size > MAX_BYTES) return null;
  const ext = MIME_TO_EXT[file.type] ?? "";
  if (!ext) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const dir = path.join(process.cwd(), "public", "uploads", subdir);
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const abs = path.join(dir, name);
    await writeFile(abs, buffer);
    return `/uploads/${subdir}/${name}`;
  } catch (error) {
    console.error(`[uploads.${subdir}] Falling back to database image URL`, error);
    return `data:${file.type};base64,${buffer.toString("base64")}`;
  }
}
