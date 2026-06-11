import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};

const PRIVATE_PREFIX = "private-docs/owner-requests";

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function storageKey(userId: number, slot: string, ext: string): string {
  const stamp = Date.now();
  const rand = crypto.randomUUID().slice(0, 8);
  return `${PRIVATE_PREFIX}/${userId}/${slot}-${stamp}-${rand}.${ext}`;
}

async function saveToLocalPrivate(buffer: Buffer, storageKeyPath: string): Promise<string> {
  const rel = storageKeyPath.replace(`${PRIVATE_PREFIX}/`, "");
  const abs = path.join(process.cwd(), "private", "owner-docs", rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return storageKeyPath;
}

async function saveToPrivateBlob(buffer: Buffer, storageKeyPath: string, mime: string): Promise<string> {
  if (!hasBlobStorage()) {
    throw new ImageUploadError(
      "blob_not_configured",
      "BLOB_READ_WRITE_TOKEN is not set. Add Vercel Blob storage to the project."
    );
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(storageKeyPath, buffer, { access: "public", contentType: mime, addRandomSuffix: false });
  return blob.url;
}

/**
 * Saves a sensitive owner-request document outside /public.
 * Returns a storage reference (local path key or private blob URL) — never a public URL.
 */
export async function savePrivateOwnerDoc(file: File, userId: number, slot: string, maxBytes: number): Promise<string> {
  if (!file || file.size <= 0) {
    throw new ImageUploadError("empty", "File is empty.");
  }
  if (file.size > maxBytes) {
    throw new ImageUploadError("too_large", `File exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit.`);
  }
  const ext = MIME_TO_EXT[file.type] ?? "";
  if (!ext) {
    throw new ImageUploadError("unsupported_type", "Unsupported file type.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = storageKey(userId, slot, ext);

  if (isVercelRuntime() || hasBlobStorage()) {
    return saveToPrivateBlob(buffer, key, file.type);
  }
  return saveToLocalPrivate(buffer, key);
}
