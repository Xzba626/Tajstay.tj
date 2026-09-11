import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";

function contentRedirect(req: Request, params: Record<string, string>) {
  const url = publicUrl(req, "/dashboard/admin?section=content");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

/**
 * Wrap admin content POST handlers: auth + try/catch instead of opaque 500.
 * `source` identifies which content card this is (e.g. "home-banner", "support") - it's tagged
 * onto the redirect as `form=<source>` so the success/error message only ever renders under the
 * card that actually submitted, instead of every card sharing one generic ok/error state (the
 * cause of a stale message from one form appearing under an unrelated one).
 */
export async function runAdminContentPost(
  req: Request,
  source: string,
  handler: () => Promise<void | NextResponse>
): Promise<NextResponse> {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  try {
    const result = await handler();
    if (result instanceof NextResponse) return result;
    return contentRedirect(req, { ok: "content-saved", form: source });
  } catch (err) {
    console.error("[admin/content]", err);
    return contentRedirect(req, { error: "content-save", form: source });
  }
}
