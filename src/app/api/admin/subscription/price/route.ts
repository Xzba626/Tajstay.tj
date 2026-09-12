import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { setSubscriptionMonthlyPrice } from "@/lib/services/subscription";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const raw = form.get("subscriptionMonthlyPriceTjs");
  const price = Number(raw);
  // Reject NaN/Infinity, non-positive (a subscription with a 0 or negative price isn't a business
  // decision to make silently here), and implausibly large values (guards against a malformed/
  // injected value being accepted at face value) - a reasonable upper bound, not a hardcoded
  // "real" ceiling the business has chosen.
  const isValid = Number.isFinite(price) && price > 0 && price <= 100000;
  if (!isValid) {
    const u = publicUrl(req, "/dashboard/admin");
    u.searchParams.set("section", "finance");
    u.searchParams.set("error", "subscription_price");
    return NextResponse.redirect(u);
  }

  await setSubscriptionMonthlyPrice(price, admin.id);

  const u = publicUrl(req, "/dashboard/admin");
  u.searchParams.set("section", "finance");
  u.searchParams.set("updated", "1");
  return NextResponse.redirect(u);
}
