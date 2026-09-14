import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import type { PrivateStorageAdapter } from "@/lib/uploads/private-storage/types";
import { LocalDiskPrivateAdapter, PRIVATE_UPLOADS_ROOT } from "@/lib/uploads/private-storage/localDiskAdapter";
import { VercelBlobPrivateAdapter } from "@/lib/uploads/private-storage/vercelBlobAdapter";

export type { PrivateStorageAdapter, PrivateFileResult } from "@/lib/uploads/private-storage/types";
export { PRIVATE_UPLOADS_ROOT };

export function hasPrivateBlobStorage(): boolean {
  return Boolean(process.env.BLOB_PRIVATE_READ_WRITE_TOKEN?.trim());
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Whether this process is allowed to use the local-disk private adapter at all. Today this is
 * exactly "not running on Vercel" (genuine local dev). It is deliberately NOT "no private Blob
 * token configured" - that would let a misconfigured Vercel deployment silently fall through to a
 * local-disk write that either happens to fail because the filesystem is read-only (today), or
 * happens to succeed somewhere unintended (if that ever stops being true). A future VPS deployment
 * needs its own explicit opt-in here (e.g. a `PRIVATE_STORAGE_PROVIDER=local-disk` env var checked
 * alongside "not Vercel"), added when a VPS adapter actually exists - not assumed now.
 */
function isLocalDiskAllowedEnvironment(): boolean {
  return !isVercelRuntime();
}

/**
 * The ONLY place in the codebase that decides which private-storage provider is active.
 * Everything else (saveUploadFile's private branch, servePrivateFile, deletePrivateUploadPathname,
 * the migration script) calls this and talks only to the returned `PrivateStorageAdapter`
 * interface - swapping in a VPS-backed adapter later means adding one file here and changing this
 * one function, not touching Payment/Chat/KYC business logic.
 *
 * Fails closed EXPLICITLY, not by accident: on Vercel (or any future "production-like" environment)
 * without a configured private-capable provider, this throws a clear configuration error before any
 * adapter is even constructed - it does NOT fall through to the local-disk adapter and hope its
 * write fails because the filesystem happens to be read-only. Local disk is only ever chosen in an
 * environment explicitly allowed to use it (today: genuine local dev, i.e. not Vercel). There is no
 * path from here to a public-storage adapter under any condition.
 */
export function getPrivateStorageAdapter(): PrivateStorageAdapter {
  if (hasPrivateBlobStorage()) return new VercelBlobPrivateAdapter();
  if (isLocalDiskAllowedEnvironment()) return new LocalDiskPrivateAdapter();
  throw new ImageUploadError(
    "private_storage_not_configured",
    "No private storage provider is configured for this environment (BLOB_PRIVATE_READ_WRITE_TOKEN is not set, and local-disk storage is not permitted here)."
  );
}
