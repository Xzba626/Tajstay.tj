import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { agentLog } from "@/lib/debug/agentLog";
import { getPrivateStorageAdapter } from "@/lib/uploads/private-storage";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export type UploadAccess = "public" | "private";

// Re-exported for existing importers (fileRouteHelpers, deletePrivateUpload, migration script) -
// the actual provider selection lives in ./private-storage, not here. Public storage (hotel/room
// photos) is unrelated to the VPS-migration concern this boundary exists for and is left as a
// direct Vercel Blob / public/uploads implementation below.
export { PRIVATE_UPLOADS_ROOT, hasPrivateBlobStorage } from "@/lib/uploads/private-storage";

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function hasPublicBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function randomFilename(storagePath: string, ext: string): string {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${normalized}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
}

async function saveToLocalDiskPublic(buffer: Buffer, storagePath: string, ext: string): Promise<string> {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const dir = path.join(process.cwd(), "public", "uploads", ...normalized.split("/"));
  try {
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    await writeFile(path.join(dir, name), buffer);
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

async function saveToVercelBlobPublic(buffer: Buffer, storagePath: string, ext: string, mime: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token?.trim()) {
    agentLog("saveUpload.ts:blob", "blob token missing on vercel", { vercel: isVercelRuntime() }, "H1");
    throw new ImageUploadError("blob_not_configured", "BLOB_READ_WRITE_TOKEN is not set. Add Vercel Blob storage to the project.");
  }
  try {
    const { put } = await import("@vercel/blob");
    const name = randomFilename(storagePath, ext);
    const blob = await put(name, buffer, { access: "public", contentType: mime, token });
    agentLog("saveUpload.ts:blob", "blob upload ok", { storagePath, urlHost: new URL(blob.url).host }, "H1");
    console.error(JSON.stringify({ tag: "tajstay-upload", ok: true, storagePath, access: "public" }));
    return blob.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ tag: "tajstay-upload", ok: false, storagePath, access: "public", error: msg.slice(0, 200) }));
    agentLog("saveUpload.ts:blob", "blob put failed", { storagePath, msg: msg.slice(0, 120) }, "H1");
    throw new ImageUploadError("store_failed", `Blob upload failed: ${msg.slice(0, 80)}`);
  }
}

/** Private uploads never touch a provider SDK directly - only the adapter boundary in
 * ./private-storage, which is the single place a future VPS migration needs to change. This never
 * falls back to public storage on a private-provider failure: `getPrivateStorageAdapter()` either
 * returns a working adapter or throws an explicit configuration error (see its own doc comment -
 * it does not hand back the local-disk adapter outside an environment allowed to use it) - there
 * is no code path here that redirects a failed/misconfigured private write to the public
 * bucket/directory. */
async function saveToPrivateStorage(buffer: Buffer, storagePath: string, ext: string, mime: string): Promise<string> {
  try {
    const pathname = randomFilename(storagePath, ext);
    const adapter = getPrivateStorageAdapter();
    return await adapter.put(pathname, buffer, mime);
  } catch (err) {
    if (err instanceof ImageUploadError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    agentLog("saveUpload.ts:private", "private store write failed", { storagePath, msg: msg.slice(0, 120) }, "H1");
    throw new ImageUploadError("store_failed", "Failed to save file to private storage.");
  }
}

/**
 * Saves a file to Vercel Blob (production) or disk (local dev).
 * @param storagePath e.g. `hotel-covers`, `chat-attachments/12`, `payment-proofs`
 * @param access `"public"` for content meant to be openly viewable (hotel/room photos); `"private"`
 *   for anything a specific user's session must be checked before serving (payment proofs, guest
 *   identity documents, chat attachments). No default - every call site must decide. For `"private"`,
 *   the returned value is a bare pathname (never a fetchable URL); callers must serve it back to a
 *   client only through `servePrivateFile()`, never as a raw `<img src>`/`<a href>`.
 */
export async function saveUploadFile(
  file: File,
  storagePath: string,
  maxBytes: number,
  access: UploadAccess
): Promise<string> {
  agentLog("saveUpload.ts:entry", "saveUploadFile called", {
    storagePath,
    access,
    size: file?.size ?? 0,
    vercel: isVercelRuntime(),
    hasPublicBlob: hasPublicBlobStorage()
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

  if (access === "private") {
    return saveToPrivateStorage(buffer, storagePath, ext, file.type);
  }

  if (isVercelRuntime() || hasPublicBlobStorage()) {
    return saveToVercelBlobPublic(buffer, storagePath, ext, file.type);
  }
  return saveToLocalDiskPublic(buffer, storagePath, ext);
}
