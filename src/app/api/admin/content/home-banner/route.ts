import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { saveHomeBanner } from "@/lib/site-content";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  const subtitle = String(form.get("subtitle") || "").trim();
  const ctaText = String(form.get("ctaText") || "").trim();
  const ctaHref = String(form.get("ctaHref") || "").trim();
  const enabled = String(form.get("enabled") || "") === "on";

  if (!title || !subtitle || !ctaText) {
    return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
  }

  await saveHomeBanner({
    enabled,
    title,
    subtitle,
    ctaText,
    ctaHref: ctaHref || "/search"
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=content"));
}
