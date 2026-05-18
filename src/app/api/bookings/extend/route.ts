import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { extendBookingPaymentWindowAdmin } from "@/lib/bookings/adminBookingActions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireUser(["ADMIN"]);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { bookingId?: unknown };
  const bookingId = Number(body?.bookingId);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  try {
    const { expiresAt, paymentTimerPaused } = await extendBookingPaymentWindowAdmin(bookingId);
    return NextResponse.json(
      { ok: true, expiresAt: expiresAt.toISOString(), paymentTimerPaused },
      { status: 200 }
    );
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "INVALID_STATUS") {
      return NextResponse.json({ error: "Таймер доступен только до отправки чека" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
