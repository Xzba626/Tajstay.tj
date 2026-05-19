import { NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { saveOwnerPaymentMethods } from "@/lib/owner-payment-methods";

export async function POST(req: Request) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const form = await req.formData();
  const raw = String(form.get("methods") || "");
  const methods = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  try {
    await saveOwnerPaymentMethods(owner.id, methods);
  } catch (err) {
    console.error("[owner/payment-methods]", err);
    const url = publicUrl(req, "/dashboard/owner?section=overview");
    url.searchParams.set("error", "payment-methods-save");
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=overview"));
}
