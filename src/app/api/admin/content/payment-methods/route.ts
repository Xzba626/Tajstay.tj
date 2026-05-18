import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { savePaymentCatalog } from "@/lib/site-content";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const raw = String(form.get("methods") || "");
  const methods = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  await savePaymentCatalog({ methods });
  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=content"));
}
