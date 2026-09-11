import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { rejectBookingPayment } from "@/lib/bookings/paymentReviewActions";

/** Owner rejects a payment proof for a booking at one of their own hotels. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const bookingId = Number(params.id);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason = String(body?.reason ?? "").trim();

  try {
    await rejectBookingPayment({ bookingId, actorId: owner.id, actorRole: "OWNER", reason });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "NOT_ON_REVIEW") {
      return NextResponse.json({ error: "Чек не ожидает проверки" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
