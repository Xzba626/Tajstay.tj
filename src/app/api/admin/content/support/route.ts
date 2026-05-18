import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { saveSupportContacts } from "@/lib/site-content";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  await saveSupportContacts({
    supportTitle: String(form.get("supportTitle") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    whatsapp: String(form.get("whatsapp") ?? ""),
    telegram: String(form.get("telegram") ?? ""),
    instagram: String(form.get("instagram") ?? ""),
    workingHours: String(form.get("workingHours") ?? "")
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=content"));
}

