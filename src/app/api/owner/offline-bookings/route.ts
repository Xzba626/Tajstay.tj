import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";
import { BOOKING_SOURCE } from "@/lib/domain/booking";
import { createOwnerOfflineBooking } from "@/lib/services/ownerOfflineBooking";
import { OFFLINE_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const roomId = Number(req.nextUrl.searchParams.get("roomId") || "") || undefined;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1);
  const pageSize = 20;

  const where = {
    source: BOOKING_SOURCE.OWNER_MANUAL,
    room: { hotel: { ownerId: owner.id } },
    ...(roomId ? { roomId } : {})
  };

  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: { room: { include: { hotel: true } } },
      orderBy: { checkIn: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return NextResponse.json({
    ok: true,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items
  });
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const wantsJson =
    (req.headers.get("accept") ?? "").toLowerCase().includes("application/json") ||
    req.nextUrl.searchParams.get("json") === "1";

  const form = await req.formData();
  const roomId = Number(form.get("roomId"));
  const checkIn = parseDateOnly(String(form.get("checkIn") ?? ""));
  const checkOut = parseDateOnly(String(form.get("checkOut") ?? ""));
  const guestName = String(form.get("guestName") ?? "").trim();
  const guestPhone = String(form.get("guestPhone") ?? "").trim();
  const guestEmail = String(form.get("guestEmail") ?? "").trim() || null;
  const guestCount = Number(form.get("guestCount") || "1") || 1;
  const totalPrice = Number(form.get("totalPrice") || "0");
  const prepaymentRaw = form.get("prepayment");
  const prepayment = prepaymentRaw != null && String(prepaymentRaw).trim() !== "" ? Number(prepaymentRaw) : null;
  const offlinePaymentType = String(form.get("offlinePaymentType") ?? "").trim() || null;
  const offlineNote = String(form.get("offlineNote") ?? "").trim() || null;
  const offlineStatusRaw = String(form.get("offlineStatus") ?? OFFLINE_STATUS.CONFIRMED).toUpperCase();

  if (!roomId || !checkIn || !checkOut || !guestName || !guestPhone || !totalPrice) {
    if (wantsJson) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const u = publicUrl(req, "/dashboard/owner");
    u.searchParams.set("section", "offline-bookings");
    u.searchParams.set("error", "invalid");
    return NextResponse.redirect(u);
  }

  try {
    const booking = await createOwnerOfflineBooking({
      ownerId: owner.id,
      roomId,
      checkIn,
      checkOut,
      guestName,
      guestPhone,
      guestEmail,
      guestCount,
      totalPrice,
      prepayment,
      offlinePaymentType,
      offlineNote,
      offlineStatus: offlineStatusRaw as (typeof OFFLINE_STATUS)[keyof typeof OFFLINE_STATUS]
    });

    if (wantsJson) return NextResponse.json({ ok: true, bookingId: booking.id, publicCode: booking.publicCode });

    const u = publicUrl(req, "/dashboard/owner");
    u.searchParams.set("section", "offline-bookings");
    u.searchParams.set("created", "1");
    return NextResponse.redirect(u);
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (wantsJson) return NextResponse.json({ error: code }, { status: 400 });
    const u = publicUrl(req, "/dashboard/owner");
    u.searchParams.set("section", "offline-bookings");
    u.searchParams.set("error", code === "dates_unavailable" ? "dates" : "failed");
    return NextResponse.redirect(u);
  }
}
