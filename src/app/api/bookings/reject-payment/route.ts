import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { rejectBookingPaymentAdmin } from "@/lib/bookings/adminBookingActions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireUser(["ADMIN"]);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { bookingId?: unknown; reason?: unknown };
  const bookingId = Number(body?.bookingId);
  const reason = String(body?.reason ?? "").trim();

  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }
  if (!reason || reason.length < 3) {
    return NextResponse.json({ error: "Укажите причину отклонения (минимум 3 символа)" }, { status: 400 });
  }

  try {
    await rejectBookingPaymentAdmin(bookingId, admin.id, reason);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "NOT_ON_REVIEW") {
      return NextResponse.json({ error: "Чек не ожидает проверки" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
