import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_BYTES = 4 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

/** Сохраняет вложение чата в public/uploads/chat-attachments/{bookingId}/ */
export async function saveChatAttachmentFile(file: File, bookingId: number): Promise<string | null> {
  if (!file || file.size <= 0 || file.size > MAX_BYTES) return null;
  const ext = MIME_TO_EXT[file.type] ?? "";
  if (!ext) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const sub = path.join("chat-attachments", String(bookingId));
  const dir = path.join(process.cwd(), "public", "uploads", sub);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const abs = path.join(dir, name);
  await writeFile(abs, buffer);
  return `/uploads/${sub.replace(/\\/g, "/")}/${name}`;
}
