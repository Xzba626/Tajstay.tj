import { getPrivateStorageAdapter } from "@/lib/uploads/private-storage";

/** Deletes a private upload (chat attachment, payment proof, guest document) given the bare
 * pathname saved by `saveUploadFile(..., "private")`. Mirrors `deletePublicUploadUrl` for the
 * private storage path - used when a chat message/booking record referencing it is deleted.
 * Talks only to the `PrivateStorageAdapter` boundary, never a specific provider's SDK. */
export async function deletePrivateUploadPathname(pathname: string | null | undefined): Promise<boolean> {
  if (!pathname || typeof pathname !== "string") return false;
  const p = pathname.trim();
  if (!p || p.startsWith("/") || p.startsWith("http://") || p.startsWith("https://")) return false;

  try {
    await getPrivateStorageAdapter().del(p);
    return true;
  } catch {
    // getPrivateStorageAdapter() throws on a misconfigured environment (see ./private-storage) -
    // this function's contract is "best-effort, never throws", same as deletePublicUploadUrl.
    return false;
  }
}
