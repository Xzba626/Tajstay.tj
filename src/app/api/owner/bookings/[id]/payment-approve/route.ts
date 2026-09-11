import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { confirmBookingPayment } from "@/lib/bookings/paymentReviewActions";

/** Owner confirms a payment proof for a booking at one of their own hotels. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const bookingId = Number(params.id);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
  }

  try {
    await confirmBookingPayment({ bookingId, actorId: owner.id, actorRole: "OWNER" });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "NOT_ON_REVIEW") {
      return NextResponse.json({ error: "Чек не ожидает подтверждения" }, { status: 400 });
    }
    if (code === "NO_PROOF") return NextResponse.json({ error: "Нет загруженного чека" }, { status: 400 });
    if (code === "BAD_PAYMENT") {
      return NextResponse.json({ error: "Платёж не найден/не ожидает подтверждения" }, { status: 400 });
    }
    if (code === "DATES_UNAVAILABLE") {
      return NextResponse.json({ error: "Этот номер уже занят на выбранные даты." }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
