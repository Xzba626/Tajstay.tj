import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { computeRoomTotalPrice, computeRoomTypeTotalPrice } from "@/lib/services/bookingPricing";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { generateBookingCode } from "@/lib/services/bookingCode";
import { normalizePhone } from "@/lib/validation/phone";
import { publicUrl } from "@/lib/http/publicOrigin";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { initializeBookingChatRoom } from "@/lib/chat/initializeBookingChat";
import { notifyNewBookingRequest } from "@/lib/notifications/bookingChatNotify";
import { dispatchBookingCreatedEmails } from "@/lib/email/bookingEmailDispatch";

function bookingFormRedirect(
  req: NextRequest,
  opts: { roomId: number; checkIn: string; checkOut: string; code: string }
) {
  const u = publicUrl(req, "/booking");
  if (opts.roomId > 0) u.searchParams.set("roomId", String(opts.roomId));
  if (opts.checkIn) u.searchParams.set("checkIn", opts.checkIn);
  if (opts.checkOut) u.searchParams.set("checkOut", opts.checkOut);
  u.searchParams.set("bookErr", opts.code);
  return NextResponse.redirect(u);
}

function bookingErrorCode(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("unavailable") || msg.includes("blocked") || msg.includes("not available")) return "unavailable";
  return "failed";
}

export async function POST(req: NextRequest) {
  const wantsJson =
    (req.headers.get("accept") ?? "").toLowerCase().includes("application/json") ||
    (req.headers.get("x-json") ?? "").trim() === "1" ||
    req.nextUrl.searchParams.get("json") === "1";

  const form = await req.formData();
  const roomTypeId = Number(form.get("roomTypeId"));
  const roomId = Number(form.get("roomId"));
  const checkInRaw = String(form.get("checkIn") ?? "");
  const checkOutRaw = String(form.get("checkOut") ?? "");
  const phoneRaw = String(form.get("phone") || "").trim();
  const phone = normalizePhone(phoneRaw);
  const guestName = String(form.get("guestName") || "").trim();
  const guestEmailRaw = String(form.get("guestEmail") || "").trim();
  const guestEmail = guestEmailRaw ? guestEmailRaw.toLowerCase() : null;
  const paymentMethodRaw = String(form.get("paymentMethod") || "ALIF").toUpperCase();
  const paymentMethod = paymentMethodRaw === "DC" ? "DC" : "ALIF";
  const guestCountRaw = Number(form.get("guestCount") ?? form.get("guests") ?? 1);
  const guestCount =
    Number.isFinite(guestCountRaw) && guestCountRaw >= 1 ? Math.min(99, Math.floor(guestCountRaw)) : 1;

  const ip = clientIp(req);
  const rl = rateLimit(`post:bookings:${ip}`, 30, 60_000);
  if (!rl.ok) {
    if (!roomId) {
      const u = publicUrl(req, "/search");
      u.searchParams.set("bookErr", "rate");
      return NextResponse.redirect(u);
    }
    return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "rate" });
  }

  const sessionUser = await requireUser(["GUEST", "OWNER", "ADMIN"]);

  const checkIn = new Date(checkInRaw);
  const checkOut = new Date(checkOutRaw);

  if ((!roomId && !roomTypeId) || !phone || Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    if (wantsJson) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return bookingFormRedirect(req, { roomId: roomId || 0, checkIn: checkInRaw, checkOut: checkOutRaw, code: "invalid" });
  }
  if (checkOut.getTime() <= checkIn.getTime()) {
    if (wantsJson) return NextResponse.json({ error: "dates" }, { status: 400 });
    return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "dates" });
  }

  try {
    let userId = sessionUser?.id;
    if (!userId) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        if (wantsJson) return NextResponse.json({ error: "phone_in_use" }, { status: 400 });
        return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "phone_in_use" });
      }
      const emailInUse = guestEmail ? await prisma.user.findUnique({ where: { email: guestEmail } }) : null;
      const passwordHash = await hashPassword(`guest-${crypto.randomUUID()}`);
      const createdGuest = await prisma.user.create({
        data: {
          name: guestName || "Guest user",
          phone,
          email: emailInUse ? null : guestEmail,
          password: passwordHash,
          role: "GUEST",
          verified: false
        }
      });
      userId = createdGuest.id;
    }

    if (!userId) {
      if (wantsJson) return NextResponse.json({ error: "failed" }, { status: 500 });
      return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "failed" });
    }

    const pricing = roomTypeId
      ? await computeRoomTypeTotalPrice({ roomTypeId, checkIn, checkOut, guestCount })
      : await computeRoomTotalPrice({ roomId, checkIn, checkOut, guestCount });

    let resolvedRoomTypeId = roomTypeId || null;
    let resolvedRoomId: number | null = roomId || null;
    if (!resolvedRoomTypeId && resolvedRoomId) {
      const r = await prisma.room.findUnique({
        where: { id: resolvedRoomId },
        select: { roomTypeId: true }
      });
      resolvedRoomTypeId = r?.roomTypeId ?? null;
    }
    // Guest has 15 minutes to submit payment proof after booking creation.
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const publicCode = await generateBookingCode("TJ");
    const paymentStatus = "PENDING";

    const booking = await prisma.booking.create({
      data: {
        publicCode,
        userId,
        roomTypeId: resolvedRoomTypeId,
        roomId: resolvedRoomId,
        assignedRoomId: resolvedRoomId,
        checkIn,
        checkOut,
        totalPrice: pricing.totalPrice,
        commission: pricing.commission,
        subtotal: pricing.ownerPayoutAfterEscrow + pricing.commission,
        serviceFee: pricing.serviceFee,
        taxAmount: pricing.taxAmount,
        currency: "TJS",
        paymentStatus,
        paymentMethod,
        payOnArrival: false,
        phone,
        status: BOOKING_STATUS.WAITING_PAYMENT,
        expiresAt
      }
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId,
        provider: "MANUAL",
        method: paymentMethod,
        status: "PENDING",
        currency: "TJS",
        amount: booking.totalPrice
      }
    });

    await prisma.transactionLog.create({
      data: {
        bookingId: booking.id,
        type: "BOOKING_CREATED",
        payload: JSON.stringify({
          roomId,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          paymentMethod,
          publicCode,
          expiresAt: expiresAt.toISOString(),
          totals: {
            subtotal: pricing.ownerPayoutAfterEscrow + pricing.commission,
            serviceFee: pricing.serviceFee,
            taxAmount: pricing.taxAmount,
            totalPrice: pricing.totalPrice,
            commission: pricing.commission,
            ownerPayoutAfterEscrow: pricing.ownerPayoutAfterEscrow,
            totalUsd: pricing.totalUsd
          }
        })
      }
    });

    const ownerTarget = resolvedRoomId
      ? await prisma.room.findUnique({ where: { id: resolvedRoomId }, include: { hotel: true } })
      : resolvedRoomTypeId
        ? await prisma.roomType.findUnique({ where: { id: resolvedRoomTypeId }, include: { hotel: true } })
        : null;

    if (ownerTarget && "hotel" in ownerTarget) {
      const guestLabel = guestName?.trim() || phone || "Гость";
      await notifyNewBookingRequest({
        bookingId: booking.id,
        ownerId: ownerTarget.hotel.ownerId,
        hotelId: ownerTarget.hotel.id,
        hotelName: ownerTarget.hotel.name,
        guestLabel
      });
    }

    void dispatchBookingCreatedEmails(booking.id).catch((e) => {
      console.error("[bookings] booking created emails failed", booking.id, e);
    });

    try {
      const chatInit = await initializeBookingChatRoom(booking.id);
      if (!chatInit.ok && chatInit.reason !== "no_admin") {
        console.warn("[bookings] chat init skipped:", chatInit.reason, "bookingId=", booking.id);
      } else if (!chatInit.ok) {
        console.warn("[bookings] chat init: no ADMIN user in DB — add admin seed for three-way chat.");
      }
    } catch (e) {
      console.error("[bookings] chat init failed", booking.id, e);
    }

    // OAuth (Google): в профиле был служебный google_* — сохраняем реальный телефон из брони для следующих раз.
    if (sessionUser && sessionUser.id === userId && phone) {
      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
      if (dbUser?.phone && isPlaceholderAccountPhone(dbUser.phone)) {
        const taken = await prisma.user.findFirst({ where: { phone, NOT: { id: userId } }, select: { id: true } });
        if (!taken) {
          await prisma.user.update({ where: { id: userId }, data: { phone } });
        }
      }
    }

    if (wantsJson) {
      const jsonRes = NextResponse.json(
        {
          ok: true,
          bookingId: booking.id,
          publicCode,
          status: booking.status,
          expiresAt: booking.expiresAt?.toISOString() ?? null,
          chatUrl: `/chat/booking/${booking.id}`
        },
        { status: 200 }
      );
      // Новый гость создаётся без редиректа — без cookie сессии страница /chat/booking/:id даёт 404 (requireUser).
      if (!sessionUser) {
        await createSessionCookie(userId, jsonRes);
      }
      return jsonRes;
    }

    const response = NextResponse.redirect(publicUrl(req, `/chat/booking/${booking.id}`));
    if (!sessionUser) {
      await createSessionCookie(userId, response);
    }
    return response;
  } catch (err: unknown) {
    const code = bookingErrorCode(err);
    const status = code === "unavailable" ? 409 : 500;
    if (wantsJson) {
      return NextResponse.json(
        { error: code, message: "Номер недоступен на выбранные даты. Выберите другие дни." },
        { status }
      );
    }
    return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code });
  }
}


