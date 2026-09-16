import { NextRequest, NextResponse } from "next/server";
import { getManagerUser, requireHotelPermission, HOTEL_PERMISSION } from "@/lib/staff/hotelAccess";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { recordHotelBookingPayment } from "@/lib/services/recordHotelPayment";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getManagerUser();
  if (!user) return forbiddenJson();

  const bookingId = Number(params.id);
  if (!bookingId) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const hotelId = Number(body.hotelId || "");
  const settlement = String(body.settlement || "CASH").toUpperCase() === "CARD" ? "CARD" : "CASH";
  if (!hotelId) return NextResponse.json({ error: "hotel_required" }, { status: 400 });

  try {
    await requireHotelPermission(user.id, hotelId, HOTEL_PERMISSION.PAYMENT_RECORD);
    const result = await recordHotelBookingPayment({
      hotelId,
      bookingId,
      actorUserId: user.id,
      actorRole: "MANAGER",
      settlement
    });
    return NextResponse.json(result);
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "not_found") return NextResponse.json({ error: code }, { status: 404 });
    const status = code === "invalid_state" ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
