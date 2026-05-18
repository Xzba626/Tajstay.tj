import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { saveBrandSettings } from "@/lib/site-content";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const siteName = String(form.get("siteName") || "").trim();
  const logoMainUrl = String(form.get("logoMainUrl") || "").trim();
  const logoMarkUrl = String(form.get("logoMarkUrl") || "").trim();
  const faviconUrl = String(form.get("faviconUrl") || "").trim();

  await saveBrandSettings({
    siteName,
    logoMainUrl,
    logoMarkUrl,
    faviconUrl
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=content"));
}

