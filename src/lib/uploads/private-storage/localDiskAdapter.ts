import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrivateStorageAdapter, PrivateFileResult } from "@/lib/uploads/private-storage/types";

/** Root directory for private uploads (payment proofs, guest/KYC docs, chat attachments) - kept
 * outside `public/` so Next's static file server can never serve them directly. Used for local
 * dev today; a future VPS deployment would point this at a private, non-web-served path on that
 * host's own filesystem (or swap in an object-storage adapter entirely) without any business-logic
 * change - see `../index.ts`. */
export const PRIVATE_UPLOADS_ROOT = path.join(process.cwd(), "private-uploads");

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

function contentTypeForPathname(pathname: string): string {
  const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_CONTENT_TYPE[ext] ?? "application/octet-stream";
}

/** Never trust a caller-controlled value as the actual read/write target: resolve it against the
 * private root and verify the result is still inside that root. Closes path traversal (`../`)
 * regardless of what ends up stored in the DB. */
function resolveSafePath(pathname: string): string | null {
  const abs = path.resolve(PRIVATE_UPLOADS_ROOT, pathname);
  const rootWithSep = PRIVATE_UPLOADS_ROOT.endsWith(path.sep) ? PRIVATE_UPLOADS_ROOT : PRIVATE_UPLOADS_ROOT + path.sep;
  if (abs !== PRIVATE_UPLOADS_ROOT && !abs.startsWith(rootWithSep)) return null;
  return abs;
}

export class LocalDiskPrivateAdapter implements PrivateStorageAdapter {
  async put(pathname: string, buffer: Buffer): Promise<string> {
    const abs = resolveSafePath(pathname);
    if (!abs) throw new Error("unsafe_pathname");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    return pathname;
  }

  async get(pathname: string): Promise<PrivateFileResult | null> {
    const abs = resolveSafePath(pathname);
    if (!abs) return null;
    try {
      const buffer = await readFile(abs);
      return { buffer, contentType: contentTypeForPathname(pathname) };
    } catch {
      return null;
    }
  }

  async del(pathname: string): Promise<void> {
    const abs = resolveSafePath(pathname);
    if (!abs) return;
    await unlink(abs).catch(() => undefined);
  }
}
