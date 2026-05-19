import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { agentLog } from "@/lib/debug/agentLog";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function saveToLocalDisk(buffer: Buffer, storagePath: string, ext: string): Promise<string> {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const dir = path.join(process.cwd(), "public", "uploads", ...normalized.split("/"));
  try {
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const abs = path.join(dir, name);
    await writeFile(abs, buffer);
    return `/uploads/${normalized}/${name}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    agentLog("saveUpload.ts:local", "local disk write failed", { storagePath, msg: msg.slice(0, 120) }, "H2");
    if (msg.includes("eacces") || msg.includes("eperm") || msg.includes("read-only") || msg.includes("erofs")) {
      throw new ImageUploadError(
        "store_readonly",
        "Cannot write uploads to disk on this host (use BLOB_READ_WRITE_TOKEN on Vercel)."
      );
    }
    throw new ImageUploadError("store_failed", "Failed to save file on server.");
  }
}

async function saveToVercelBlob(buffer: Buffer, storagePath: string, ext: string, mime: string): Promise<string> {
  if (!hasBlobStorage()) {
    agentLog("saveUpload.ts:blob", "blob token missing on vercel", { vercel: isVercelRuntime() }, "H1");
    throw new ImageUploadError(
      "blob_not_configured",
      "BLOB_READ_WRITE_TOKEN is not set. Add Vercel Blob storage to the project."
    );
  }
  const { put } = await import("@vercel/blob");
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const name = `${normalized}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const blob = await put(name, buffer, { access: "public", contentType: mime });
  agentLog("saveUpload.ts:blob", "blob upload ok", { storagePath: normalized, urlHost: new URL(blob.url).host }, "H1");
  return blob.url;
}

/**
 * Saves a file to Vercel Blob (production) or public/uploads (local dev).
 * @param storagePath e.g. `hotel-covers`, `chat-attachments/12`, `payment-proofs`
 */
export async function saveUploadFile(
  file: File,
  storagePath: string,
  maxBytes: number
): Promise<string> {
  agentLog("saveUpload.ts:entry", "saveUploadFile called", {
    storagePath,
    size: file?.size ?? 0,
    vercel: isVercelRuntime(),
    hasBlob: hasBlobStorage()
  }, "H1");

  if (!file || file.size <= 0) {
    throw new ImageUploadError("empty", "File is empty.");
  }
  if (file.size > maxBytes) {
    throw new ImageUploadError("too_large", `File exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit.`);
  }
  const ext = MIME_TO_EXT[file.type] ?? "";
  if (!ext) {
    throw new ImageUploadError("unsupported_type", "Only JPG, PNG, and WebP are allowed.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isVercelRuntime() || hasBlobStorage()) {
    return saveToVercelBlob(buffer, storagePath, ext, file.type);
  }

  return saveToLocalDisk(buffer, storagePath, ext);
}
