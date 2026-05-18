import { unlink } from "node:fs/promises";
import path from "node:path";

/** Удаляет файл по публичному URL вида /uploads/... из каталога public. */
export async function deletePublicUploadUrl(url: string | null | undefined): Promise<boolean> {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u.startsWith("/uploads/")) return false;
  const rel = u.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);
  if (!abs.startsWith(path.join(process.cwd(), "public", "uploads"))) return false;
  try {
    await unlink(abs);
    return true;
  } catch {
    return false;
  }
}
