import { NextResponse } from "next/server";
import { runAdminContentPost } from "@/lib/admin/content-route";
import { saveHomeBanner } from "@/lib/site-content";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  return runAdminContentPost(req, async () => {
    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const subtitle = String(form.get("subtitle") || "").trim();
    const ctaText = String(form.get("ctaText") || "").trim();
    const ctaHref = String(form.get("ctaHref") || "").trim();
    const enabled = String(form.get("enabled") || "") === "on";

    if (!title || !subtitle || !ctaText) {
      const url = publicUrl(req, "/dashboard/admin?section=content");
      url.searchParams.set("error", "content-required");
      return NextResponse.redirect(url);
    }

    await saveHomeBanner({
      enabled,
      title,
      subtitle,
      ctaText,
      ctaHref: ctaHref || "/search"
    });
  });
}
