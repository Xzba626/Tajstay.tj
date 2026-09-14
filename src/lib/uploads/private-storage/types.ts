/**
 * Provider-independent boundary for private (non-public) file storage - payment proofs, guest
 * identity documents, chat attachments. Business logic (booking/payment/chat routes, the
 * `/api/files/...` proxy) only ever talks to this interface, never to a specific provider's SDK
 * directly. This is deliberate: TajStay's production infrastructure is currently Vercel but is
 * expected to move to a VPS later - swapping the adapter returned by `getPrivateStorageAdapter()`
 * (see `./index.ts`) must be the only change needed for that migration, with zero changes to
 * Payment/Chat/KYC code.
 */
export type PrivateFileResult = {
  buffer: Buffer;
  contentType: string;
};

export interface PrivateStorageAdapter {
  /** Stores `buffer` at exactly `pathname` (already computed by the caller, including any random
   * suffix) and returns the pathname actually persisted - callers store this bare value in the
   * DB, never a full URL. */
  put(pathname: string, buffer: Buffer, contentType: string): Promise<string>;
  /** Returns the file's bytes + content type, or `null` if it doesn't exist / can't be read.
   * Never throws - a missing/unreadable file is a 404 to the caller, not a 500. */
  get(pathname: string): Promise<PrivateFileResult | null>;
  /** Best-effort delete - never throws (mirrors the existing `deletePublicUploadUrl` contract). */
  del(pathname: string): Promise<void>;
}
