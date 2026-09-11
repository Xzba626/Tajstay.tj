import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { selectHotelPaymentMethodForBooking } from "@/lib/hotels/paymentMethods";

export const dynamic = "force-dynamic";

/**
 * Guest picks which hotel payment method they'll use, BEFORE paying - this is what freezes the
 * requisites snapshot on the booking (see selectHotelPaymentMethodForBooking).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number(params.id);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const hotelPaymentMethodId = Number(body?.hotelPaymentMethodId);
  if (!Number.isFinite(hotelPaymentMethodId) || hotelPaymentMethodId < 1) {
    return NextResponse.json({ error: "Invalid hotelPaymentMethodId" }, { status: 400 });
  }

  const result = await selectHotelPaymentMethodForBooking(bookingId, user.id, hotelPaymentMethodId);
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, snapshot: result.snapshot });
}
