import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
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
import { assertDatesAvailable, DatesUnavailableError, withRoomHoldGuard } from "@/lib/booking/availability";
import { assertRoomTypeAvailable, RoomTypeUnavailableError, withRoomTypeCapacityGuard } from "@/lib/pms/inventory";

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
  let paymentMethod = paymentMethodRaw === "DC" ? "DC" : "ALIF";
  const hotelPaymentMethodIdRaw = Number(form.get("hotelPaymentMethodId"));
  const hotelPaymentMethodId =
    Number.isFinite(hotelPaymentMethodIdRaw) && hotelPaymentMethodIdRaw > 0 ? hotelPaymentMethodIdRaw : null;
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

    const ownerTarget = resolvedRoomId
      ? await prisma.room.findUnique({ where: { id: resolvedRoomId }, include: { hotel: true } })
      : resolvedRoomTypeId
        ? await prisma.roomType.findUnique({ where: { id: resolvedRoomTypeId }, include: { hotel: true } })
        : null;
    const hotelId = ownerTarget && "hotel" in ownerTarget ? ownerTarget.hotel.id : null;
    const ownerId = ownerTarget && "hotel" in ownerTarget ? ownerTarget.hotel.ownerId : null;
    const hotelStatus = ownerTarget && "hotel" in ownerTarget ? ownerTarget.hotel.status : null;

    // A PENDING/REJECTED hotel has no real inventory yet - never let a handcrafted request create
    // a real booking against one just because its roomId/roomTypeId leaked somewhere (a stale
    // link, a scraped page, direct API knowledge). The public UI already can't reach this hotel
    // (see hotel/[id]/page.tsx's own status gate), this is the same rule enforced server-side.
    if (!hotelId || hotelStatus !== "APPROVED") {
      if (wantsJson) return NextResponse.json({ error: "hotel_unavailable" }, { status: 404 });
      return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "failed" });
    }

    // Snapshot the chosen hotel-owned payment method at selection time - if the owner edits their
    // card number tomorrow, this booking must keep showing what the guest actually paid to.
    let paymentMethodSnapshot: {
      displayLabel: string;
      recipientName: string;
      paymentIdentifier: string;
      instructions: string | null;
    } | null = null;
    let resolvedHotelPaymentMethodId: number | null = null;
    if (hotelPaymentMethodId && hotelId) {
      const method = await prisma.hotelPaymentMethod.findFirst({
        where: { id: hotelPaymentMethodId, hotelId, isActive: true }
      });
      if (method) {
        resolvedHotelPaymentMethodId = method.id;
        paymentMethodSnapshot = {
          displayLabel: method.displayLabel,
          recipientName: method.recipientName,
          paymentIdentifier: method.paymentIdentifier,
          instructions: method.instructions
        };
        paymentMethod = method.displayLabel;
      }
    }

    // Idempotency guard against a literal double-submit (double-tap, a retried request, two
    // near-simultaneous POSTs from the same browser) - proven live to otherwise create two
    // separate WAITING_PAYMENT rows for the identical room+dates, since booking creation itself
    // does not check availability at all (that only happens at confirmation time via the Block
    // 2/2.1 invariants - a deliberate, documented architecture gap, not something this guard
    // changes). This only recognizes the SAME user resubmitting the SAME exact request; it is
    // not a capacity hold and says nothing about two DIFFERENT guests racing for the same room.
    const duplicateWhere = resolvedRoomId
      ? { roomId: resolvedRoomId }
      : { roomTypeId: resolvedRoomTypeId, roomId: null };
    const existingLiveBooking = await prisma.booking.findFirst({
      where: {
        userId,
        ...duplicateWhere,
        checkIn,
        checkOut,
        status: { notIn: ["REJECTED", "CANCELLED", "EXPIRED", "COMPLETED"] }
      },
      orderBy: { createdAt: "desc" }
    });
    if (existingLiveBooking) {
      if (wantsJson) {
        return NextResponse.json(
          {
            ok: true,
            bookingId: existingLiveBooking.id,
            publicCode: existingLiveBooking.publicCode,
            status: existingLiveBooking.status,
            expiresAt: existingLiveBooking.expiresAt?.toISOString() ?? null,
            chatUrl: `/chat/booking/${existingLiveBooking.id}`
          },
          { status: 200 }
        );
      }
      return NextResponse.redirect(publicUrl(req, `/chat/booking/${existingLiveBooking.id}`));
    }

    // Guest has 15 minutes to submit payment proof after booking creation.
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const publicCode = await generateBookingCode("TJ");
    const paymentStatus = "PENDING";

    const bookingData = {
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
      hotelPaymentMethodId: resolvedHotelPaymentMethodId,
      paymentMethodSnapshot: paymentMethodSnapshot ? JSON.parse(JSON.stringify(paymentMethodSnapshot)) : undefined,
      payOnArrival: false,
      phone,
      status: BOOKING_STATUS.WAITING_PAYMENT,
      expiresAt
    } as const;

// Re-checks for the same user's own live booking INSIDE the lock, so a genuinely simultaneous
    // same-user duplicate (the outer pre-check above can still miss this under real concurrency -
    // it's a plain SELECT-then-branch, not itself atomic) resolves to the SAME booking as an
    // idempotent success, never a confusing 409 for a request that, from the guest's point of
    // view, already succeeded once. Only ever returns/matches this exact user's own booking -
    // never another user's.
    async function findOwnLiveBooking(client: typeof prisma | Prisma.TransactionClient) {
      return client.booking.findFirst({
        where: { userId, ...duplicateWhere, checkIn, checkOut, status: { notIn: ["REJECTED", "CANCELLED", "EXPIRED", "COMPLETED"] } },
        orderBy: { createdAt: "desc" }
      });
    }

    // Authoritative availability check folded atomically with the write (Block 4.1) - booking
    // CREATION previously performed no availability check at all (proven live to let two
    // different guests both "successfully" create a WAITING_PAYMENT for the same room+dates,
    // see the Block 4 report). assertDatesAvailable/assertRoomTypeAvailable now also treat an
    // active (unexpired, unpaused) WAITING_PAYMENT/ON_REVIEW hold as occupying (Block 4.2 -
    // ACTIVE_HOLD_STATUSES, deliberately narrower than Block 4.1's first, unapproved-scope
    // attempt) - so this is the exact same invariant already proven for confirmation, just
    // invoked one step earlier, inside the same kind of advisory-lock-guarded transaction as
    // Block 2.1 (withRoomHoldGuard for a physical room, withRoomTypeCapacityGuard for
    // RoomType-only), not a second parallel formula.
    let booking;
    let isNewBooking = true;
    try {
      if (resolvedRoomId) {
        booking = await withRoomHoldGuard(resolvedRoomId, async (tx) => {
          const own = await findOwnLiveBooking(tx);
          if (own) {
            isNewBooking = false;
            return own;
          }
          await assertDatesAvailable({ roomId: resolvedRoomId!, checkIn, checkOut, client: tx, includeActiveHolds: true });
          return tx.booking.create({ data: bookingData });
        });
      } else if (resolvedRoomTypeId) {
        booking = await withRoomTypeCapacityGuard(resolvedRoomTypeId, async (tx) => {
          const own = await findOwnLiveBooking(tx);
          if (own) {
            isNewBooking = false;
            return own;
          }
          await assertRoomTypeAvailable({ roomTypeId: resolvedRoomTypeId!, checkIn, checkOut, client: tx, includeActiveHolds: true });
          return tx.booking.create({ data: bookingData });
        });
      } else {
        booking = await prisma.booking.create({ data: bookingData });
      }
    } catch (e) {
      if (e instanceof DatesUnavailableError || e instanceof RoomTypeUnavailableError) {
        if (wantsJson) return NextResponse.json({ error: "unavailable" }, { status: 409 });
        return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "unavailable" });
      }
      throw e;
    }

    // The lock-internal re-check (findOwnLiveBooking) found this user's own booking already
    // committed by a near-simultaneous request - true idempotent replay, not a new booking.
    // Skip Payment/TransactionLog/notification/chat-init entirely; those were already created
    // for it the first time.
    if (!isNewBooking) {
      if (wantsJson) {
        return NextResponse.json(
          {
            ok: true,
            bookingId: booking.id,
            publicCode: booking.publicCode,
            status: booking.status,
            expiresAt: booking.expiresAt?.toISOString() ?? null,
            chatUrl: `/chat/booking/${booking.id}`
          },
          { status: 200 }
        );
      }
      return NextResponse.redirect(publicUrl(req, `/chat/booking/${booking.id}`));
    }

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

    if (ownerId) {
      await prisma.notification.create({
        data: {
          userId: ownerId,
          bookingId: booking.id,
          type: "NEW_BOOKING",
          isRead: false
        }
      });
    }

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
    // A dates/room conflict is a legitimate business outcome, not a server fault - 409, not 500,
    // so a JSON API consumer can distinguish "try different dates" from "something is actually
    // broken" without parsing error text.
    const status = code === "unavailable" ? 409 : 500;
    if (wantsJson) return NextResponse.json({ error: code }, { status });
    return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code });
  }
}


