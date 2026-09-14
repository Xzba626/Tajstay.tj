import { NextResponse } from "next/server";
import { getPrivateStorageAdapter } from "@/lib/uploads/private-storage";

/**
 * Streams a private upload (payment proof, guest document, chat attachment) back to an
 * already-authorized caller. `pathname` must be the bare value stored in the DB by
 * `saveUploadFile(..., "private")` - never a full URL, and never passed here without the caller
 * having already checked the requesting user is allowed to see this specific resource.
 *
 * Talks only to the `PrivateStorageAdapter` boundary (see ./private-storage) - never a specific
 * provider's SDK - so this route needs no changes when the underlying storage provider changes.
 *
 * Always 404s on any failure (missing file, missing private store config, traversal attempt) -
 * never leaks whether a given pathname/resource exists to someone not authorized to see it.
 */
export async function servePrivateFile(pathname: string | null | undefined): Promise<NextResponse> {
  if (!pathname) return new NextResponse("Not found", { status: 404 });

  // Payment proof (only) also accepts a guest-pasted external HTTPS receipt link instead of an
  // uploaded file (see isSafeProofUrl in api/payments/proof/route.ts) - that was never our file to
  // store privately, so once our own auth check already passed, hand the browser off to it
  // directly rather than trying to fetch/re-serve bytes we never held.
  if (/^https?:\/\//i.test(pathname)) {
    return NextResponse.redirect(pathname);
  }

  let result;
  try {
    result = await getPrivateStorageAdapter().get(pathname);
  } catch {
    // getPrivateStorageAdapter() throws on a misconfigured environment (see ./private-storage) -
    // treat that the same as "not found" here too, never a 500 that could hint at internal config.
    return new NextResponse("Not found", { status: 404 });
  }
  if (!result) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store"
    }
  });
}
