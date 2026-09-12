import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { setSubscriptionMonthlyPrice } from "@/lib/services/subscription";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const price = Number(form.get("subscriptionMonthlyPriceTjs"));
  if (!Number.isFinite(price) || price < 0) {
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
