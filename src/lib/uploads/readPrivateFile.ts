import { readFile } from "node:fs/promises";
import path from "node:path";

const PRIVATE_PREFIX = "private-docs/owner-requests";

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

export type PrivateFileContent = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

function mimeFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

function filenameFromPath(filePath: string): string {
  return filePath.split("/").pop() ?? "document";
}

async function readLocalPrivate(storagePath: string): Promise<PrivateFileContent | null> {
  const rel = storagePath.startsWith(PRIVATE_PREFIX)
    ? storagePath.replace(`${PRIVATE_PREFIX}/`, "")
    : storagePath.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "private", "owner-docs", rel);
  try {
    const buffer = await readFile(abs);
    return { buffer, contentType: mimeFromPath(abs), filename: filenameFromPath(abs) };
  } catch {
    return null;
  }
}

async function readLegacyPublicUpload(urlPath: string): Promise<PrivateFileContent | null> {
  if (!urlPath.startsWith("/uploads/")) return null;
  const rel = urlPath.replace(/^\/uploads\//, "");
  const abs = path.join(process.cwd(), "public", "uploads", rel);
  try {
    const buffer = await readFile(abs);
    return { buffer, contentType: mimeFromPath(abs), filename: filenameFromPath(abs) };
  } catch {
    return null;
  }
}

async function readPrivateBlob(blobUrl: string): Promise<PrivateFileContent | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(blobUrl, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of result.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const contentType = result.blob.contentType ?? mimeFromPath(blobUrl);
    return { buffer, contentType, filename: filenameFromPath(blobUrl) };
  } catch {
    return null;
  }
}

async function readPublicBlob(blobUrl: string): Promise<PrivateFileContent | null> {
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? mimeFromPath(blobUrl);
    return { buffer, contentType, filename: filenameFromPath(blobUrl) };
  } catch {
    return null;
  }
}

/**
 * Reads a stored owner-request document by its storage reference.
 * Supports private local paths, private/public Vercel Blob URLs, and legacy /uploads paths.
 */
export async function readOwnerRequestFile(storageRef: string): Promise<PrivateFileContent | null> {
  const ref = storageRef.trim();
  if (!ref) return null;

  if (ref.startsWith(PRIVATE_PREFIX)) {
    if (ref.startsWith("http")) {
      return readPrivateBlob(ref);
    }
    return readLocalPrivate(ref);
  }

  if (ref.startsWith("/uploads/")) {
    return readLegacyPublicUpload(ref);
  }

  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    const privateResult = await readPrivateBlob(ref);
    if (privateResult) return privateResult;
    return readPublicBlob(ref);
  }

  return readLocalPrivate(ref);
}
