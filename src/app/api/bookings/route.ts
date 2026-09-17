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
  if (msg.includes("different_payment_option")) return "existing_booking_different_payment_option";
  return "failed";
}

/** BLOCK 5.4B §10: room/dates/user is still the one booking-intent identity - PAY_NOW and
 * PAY_AT_CHECK_IN are never two independent bookings. But silently treating a resubmit with a
 * DIFFERENT payment option as a plain idempotent replay would apply the wrong option to what the
 * guest just asked for without telling them. Thrown from inside the same advisory-lock guard as
 * the existing DatesUnavailableError/RoomTypeUnavailableError, caught the same way. */
class DifferentPaymentOptionError extends Error {
  constructor(message = "existing_booking_different_payment_option") {
    super(message);
    this.name = "DifferentPaymentOptionError";
  }
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
  // BLOCK 5.4B: absent/unrecognized paymentOption defaults to PAY_NOW - a legacy or unmodified
  // client that never sends this field must keep getting today's behavior, never silently become
  // a pay-at-check-in booking.
  const isPayAtCheckIn = String(form.get("paymentOption") || "PAY_NOW").toUpperCase() === "PAY_AT_CHECK_IN";
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
    const hotelAcceptsPayAtCheckIn = ownerTarget && "hotel" in ownerTarget ? ownerTarget.hotel.acceptsPayAtCheckIn : false;

    // A PENDING/REJECTED hotel has no real inventory yet - never let a handcrafted request create
    // a real booking against one just because its roomId/roomTypeId leaked somewhere (a stale
    // link, a scraped page, direct API knowledge). The public UI already can't reach this hotel
    // (see hotel/[id]/page.tsx's own status gate), this is the same rule enforced server-side.
    if (!hotelId || hotelStatus !== "APPROVED") {
      if (wantsJson) return NextResponse.json({ error: "hotel_unavailable" }, { status: 404 });
      return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "failed" });
    }

    // BLOCK 5.4B §7: the client's own choice is never authority - the hotel's own DB flag
    // (resolved above from the actual Room/RoomType->Hotel chain, not anything the client sent)
    // is the only thing that can allow a PAY_AT_CHECK_IN booking to be created.
    if (isPayAtCheckIn && !hotelAcceptsPayAtCheckIn) {
      if (wantsJson) return NextResponse.json({ error: "pay_at_checkin_not_allowed" }, { status: 403 });
      return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "pay_at_checkin_not_allowed" });
    }

    // Idempotency guard against a literal double-submit (double-tap, a retried request, two
    // near-simultaneous POSTs from the same browser) - proven live to otherwise create two
    // separate WAITING_PAYMENT rows for the identical room+dates, since booking creation itself
    // does not check availability at all (that only happens at confirmation time via the Block
    // 2/2.1 invariants - a deliberate, documented architecture gap, not something this guard
    // changes). This only recognizes the SAME user resubmitting the SAME exact request; it is
    // not a capacity hold and says nothing about two DIFFERENT guests racing for the same room.
    // Deliberately checked BEFORE payment-method validation below (BLOCK 5.2 §9/§12-J): a genuine
    // resubmit of an already-succeeded booking must always replay as that same booking, even if a
    // second, unrelated race elsewhere just deactivated the method it used - re-validating payment
    // on a pure replay would incorrectly reject a booking that already exists and already has its
    // own frozen snapshot.
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
      // BLOCK 5.4B §10: same identity (user+room/roomType+dates) but a DIFFERENT payment option
      // than the one already on file is a controlled conflict, never a silent replay that would
      // apply the wrong option to what the guest just asked for, and never a second booking.
      if (Boolean(existingLiveBooking.payOnArrival) !== isPayAtCheckIn) {
        if (wantsJson) {
          return NextResponse.json(
            { error: "existing_booking_different_payment_option", bookingId: existingLiveBooking.id, chatUrl: `/chat/booking/${existingLiveBooking.id}` },
            { status: 409 }
          );
        }
        return bookingFormRedirect(req, {
          roomId,
          checkIn: checkInRaw,
          checkOut: checkOutRaw,
          code: "existing_booking_different_payment_option"
        });
      }
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

    // BLOCK 5.4B: moved here from before the idempotency check above (found live, via a failing
    // concurrency test) - computeRoomTotalPrice/computeRoomTypeTotalPrice run their OWN
    // independent, non-transactional assertDatesAvailable call (for pricing/override lookups),
    // which - unlike the idempotency check above - has no notion of "this is the same user's own
    // existing booking, so it's fine." For Pay Now this was never visible because WAITING_PAYMENT/
    // ON_REVIEW only occupy via the opt-in active-hold check this call never enables; a
    // PAY_AT_CHECK_IN booking is CONFIRMED immediately, which occupies unconditionally, so a
    // genuine same-user resubmit would trip this pricing-only check and get a false "unavailable"
    // instead of ever reaching the idempotent-replay return above. Running pricing only after that
    // check has already short-circuited fixes it without touching assertDatesAvailable itself.
    const pricing = roomTypeId
      ? await computeRoomTypeTotalPrice({ roomTypeId, checkIn, checkOut, guestCount })
      : await computeRoomTotalPrice({ roomId, checkIn, checkOut, guestCount });

    let resolvedHotelPaymentMethodId: number | null = null;
    let paymentMethodSnapshot: {
      displayLabel: string;
      recipientName: string;
      paymentIdentifier: string;
      instructions: string | null;
    } | null = null;

    if (!isPayAtCheckIn) {
      // Authoritative payment-method validation (BLOCK 5.2). The guest-facing Wizard only ever
      // sends an id - never recipient/account/instructions text - and this is the ONLY place
      // those values are read from the database, never trusted from the request. A PAY-NOW
      // booking with no id, an id belonging to a different hotel, an inactive method, or a
      // nonexistent id are all rejected identically (no booking/payment/hold/chat/notification
      // side effects) rather than silently falling back to a placeholder payment method - see
      // BLOCK 5.0's P0 finding on the hardcoded "DC Next" card this replaced. `hotelId` here is
      // the authoritative hotel resolved above from the actual Room/RoomType chain, never
      // anything the client could influence directly.
      if (!hotelPaymentMethodId) {
        if (wantsJson) return NextResponse.json({ error: "payment_method_required" }, { status: 400 });
        return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "payment_method_required" });
      }
      const hotelPaymentMethod = await prisma.hotelPaymentMethod.findFirst({
        where: { id: hotelPaymentMethodId, hotelId, isActive: true }
      });
      if (!hotelPaymentMethod) {
        if (wantsJson) return NextResponse.json({ error: "payment_method_invalid" }, { status: 400 });
        return bookingFormRedirect(req, { roomId, checkIn: checkInRaw, checkOut: checkOutRaw, code: "payment_method_invalid" });
      }
      // Snapshot the chosen hotel-owned payment method at selection time (from the row just read
      // above, never from the request) - if the owner edits their card number tomorrow, this
      // booking must keep showing what the guest actually paid to.
      resolvedHotelPaymentMethodId = hotelPaymentMethod.id;
      paymentMethodSnapshot = {
        displayLabel: hotelPaymentMethod.displayLabel,
        recipientName: hotelPaymentMethod.recipientName,
        paymentIdentifier: hotelPaymentMethod.paymentIdentifier,
        instructions: hotelPaymentMethod.instructions
      };
      paymentMethod = hotelPaymentMethod.displayLabel;
    } else {
      // BLOCK 5.4B §7: PAY_AT_CHECK_IN never requires, validates, or uses a payment method - if a
      // stale/malicious client sent one anyway, it is simply ignored (never read past this point).
      paymentMethod = "ARRIVAL";
    }

    // PAY_NOW: guest has 15 minutes to submit payment proof after booking creation.
    // PAY_AT_CHECK_IN: no payment window at all - nothing is owed yet, so no expiresAt (§7/§15 of
    // BLOCK 5.4A's trace: a non-null-but-never-expiring hold would be the wrong trap here; the
    // clean answer is simply no deadline field at all, since this status is never in
    // ACTIVE_HOLD_STATUSES to begin with - it's CONFIRMED, already occupying at every layer).
    const expiresAt = isPayAtCheckIn ? null : new Date(Date.now() + 15 * 60 * 1000);
    const publicCode = await generateBookingCode("TJ");
    // PAY_AT_CHECK_IN: CONFIRMED + paymentStatus PENDING + no Payment row is the exact combination
    // already proven safe and load-bearing by the existing owner-manual/offline flow (BLOCK 5.4A
    // §7) - not a new state, just the first time a guest-facing PLATFORM booking uses it.
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
      paymentMethodSnapshot: paymentMethodSnapshot ? JSON.parse(JSON.stringify(paymentMethodSnapshot)) : null,
      payOnArrival: isPayAtCheckIn,
      phone,
      status: isPayAtCheckIn ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.WAITING_PAYMENT,
      expiresAt
    } as const;

// Re-checks for the same user's own live booking INSIDE the lock, so a genuinely simultaneous
    // same-user duplicate (the outer pre-check above can still miss this under real concurrency -
    // it's a plain SELECT-then-branch, not itself atomic) resolves to the SAME booking as an
    // idempotent success, never a confusing 409 for a request that, from the guest's point of
    // view, already succeeded once. Only ever returns/matches this exact user's own booking -
    // never another user's. Throws DifferentPaymentOptionError instead of silently replaying if
    // the in-flight winner used a different payment option than this request asked for (BLOCK
    // 5.4B §10, same rule as the outer pre-check above, re-applied inside the lock for the same
    // reason the outer one can miss a genuine race).
    async function findOwnLiveBooking(client: typeof prisma | Prisma.TransactionClient) {
      const own = await client.booking.findFirst({
        where: { userId, ...duplicateWhere, checkIn, checkOut, status: { notIn: ["REJECTED", "CANCELLED", "EXPIRED", "COMPLETED"] } },
        orderBy: { createdAt: "desc" }
      });
      if (own && Boolean(own.payOnArrival) !== isPayAtCheckIn) {
        throw new DifferentPaymentOptionError();
      }
      return own;
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
      if (e instanceof DifferentPaymentOptionError) {
        if (wantsJson) return NextResponse.json({ error: "existing_booking_different_payment_option" }, { status: 409 });
        return bookingFormRedirect(req, {
          roomId,
          checkIn: checkInRaw,
          checkOut: checkOutRaw,
          code: "existing_booking_different_payment_option"
        });
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

    // BLOCK 5.4B: PAY_AT_CHECK_IN never creates a Payment row - mirrors the existing owner-manual/
    // offline flow exactly (BLOCK 5.4A §7), since no money has moved through the platform at all.
    if (!isPayAtCheckIn) {
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
    }

    await prisma.transactionLog.create({
      data: {
        bookingId: booking.id,
        type: "BOOKING_CREATED",
        payload: JSON.stringify({
          roomId,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          paymentMethod,
          paymentOption: isPayAtCheckIn ? "PAY_AT_CHECK_IN" : "PAY_NOW",
          publicCode,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
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

    if (isPayAtCheckIn) {
      await prisma.notification.create({
        data: {
          userId,
          bookingId: booking.id,
          type: "BOOKING_CONFIRMED",
          isRead: false
        }
      });
      const { queueBookingConfirmationDelivery } = await import("@/lib/bookings/bookingConfirmationDelivery");
      queueBookingConfirmationDelivery(booking.id, "booking.confirmed.pay_on_arrival");
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


