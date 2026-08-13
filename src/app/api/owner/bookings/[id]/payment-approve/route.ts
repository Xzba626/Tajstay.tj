import { NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";

/**
 * Подтверждение чека переведено на админский эндпоинт
 * `POST /api/admin/bookings/[id]/confirm-payment`.
 */
export async function POST() {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  return NextResponse.json({ error: "Только админ может подтверждать оплату" }, { status: 403 });
}
