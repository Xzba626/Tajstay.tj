import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { saveLegalPages } from "@/lib/site-content";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  await saveLegalPages({
    privacyText: String(form.get("privacyText") ?? ""),
    termsText: String(form.get("termsText") ?? "")
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=content"));
}

