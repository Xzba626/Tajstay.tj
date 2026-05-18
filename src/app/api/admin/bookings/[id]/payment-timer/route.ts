import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { extendBookingPaymentWindowAdmin } from "@/lib/bookings/adminBookingActions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireUser(["ADMIN"]);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = String(body?.action ?? "").trim();

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    booking.status !== BOOKING_STATUS.WAITING_PAYMENT &&
    booking.status !== BOOKING_STATUS.WAIT_PROOF
  ) {
    return NextResponse.json({ error: "Таймер доступен только до отправки чека" }, { status: 400 });
  }

  if (action === "extend") {
    try {
      const { expiresAt, paymentTimerPaused } = await extendBookingPaymentWindowAdmin(id);
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
      throw e;
    }
  }

  if (action === "pause") {
    await prisma.booking.update({ where: { id }, data: { paymentTimerPaused: true } });
    return NextResponse.json({ ok: true, paymentTimerPaused: true }, { status: 200 });
  }

  if (action === "resume") {
    await prisma.booking.update({ where: { id }, data: { paymentTimerPaused: false } });
    return NextResponse.json({ ok: true, paymentTimerPaused: false }, { status: 200 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
