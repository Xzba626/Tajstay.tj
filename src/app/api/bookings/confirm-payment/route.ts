import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { confirmBookingPaymentAdmin } from "@/lib/bookings/adminBookingActions";

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
    await confirmBookingPaymentAdmin(bookingId, admin.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "NOT_ON_REVIEW") {
      return NextResponse.json({ error: "Чек не ожидает подтверждения админом" }, { status: 400 });
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
