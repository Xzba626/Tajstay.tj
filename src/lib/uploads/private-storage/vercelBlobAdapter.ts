import type { PrivateStorageAdapter, PrivateFileResult } from "@/lib/uploads/private-storage/types";

/** Vercel Private Blob adapter - the current (dev/staging) implementation of the
 * `PrivateStorageAdapter` boundary. TajStay's production is expected to move to a VPS later; when
 * it does, only this file and `localDiskAdapter.ts`'s VPS counterpart need to exist - nothing in
 * Payment/Chat/KYC code references `@vercel/blob` directly, only through `getPrivateStorageAdapter()`. */
export class VercelBlobPrivateAdapter implements PrivateStorageAdapter {
  private token(): string | undefined {
    return process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  }

  async put(pathname: string, buffer: Buffer, contentType: string): Promise<string> {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, buffer, { access: "private", contentType, token: this.token() });
    return blob.pathname;
  }

  async get(pathname: string): Promise<PrivateFileResult | null> {
    try {
      const { get } = await import("@vercel/blob");
      const result = await get(pathname, { access: "private", token: this.token() });
      if (!result || result.statusCode !== 200) return null;
      const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
      return { buffer, contentType: result.blob.contentType };
    } catch {
      return null;
    }
  }

  async del(pathname: string): Promise<void> {
    try {
      const { del } = await import("@vercel/blob");
      await del(pathname, { token: this.token() });
    } catch {
      /* best-effort, matches deletePublicUploadUrl's contract */
    }
  }
}
