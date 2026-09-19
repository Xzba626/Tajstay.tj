import { addDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BOOKING_SOURCE, BOOKING_STATUS, OFFLINE_STATUS } from "@/lib/domain/booking";

/** Accepts either the global singleton or an interactive-transaction client, so callers that need
 *  their reads and write inside the same transaction (see withRoomTypeCapacityGuard) can pass
 *  `tx` through instead of every query silently using its own separate connection. */
type DbClient = typeof prisma | Prisma.TransactionClient;

/** Confirmed / active online bookings — block calendar & conflict checks */
export const OCCUPYING_ONLINE_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.COMPLETED
] as const;

/** Pending online — show in calendar only, do not block new confirmations */
export const PENDING_ONLINE_STATUSES = [
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW,
  BOOKING_STATUS.PENDING_OWNER
] as const;

/**
 * Block 4.2: the approved active-hold policy, deliberately narrower than PENDING_ONLINE_STATUSES
 * above (which serves a different, pre-existing purpose - calendar display). Two statuses only,
 * each individually justified with evidence, not assumed:
 *
 * - WAITING_PAYMENT: the approved minimum scope. Every WAITING_PAYMENT row created by
 *   src/app/api/bookings/route.ts always gets a real expiresAt (`Date.now() + 15min`) - confirmed
 *   empirically, zero WAITING_PAYMENT rows with a null expiresAt exist in the local DB. A "NULL
 *   expiresAt WAITING_PAYMENT" is not a state the current write path can produce.
 *
 * - ON_REVIEW: added only after evidence, per the explicit "PAYMENT TRANSITION REQUIRES
 *   CONTINUOUS HOLD" allowance. src/app/api/payments/proof/route.ts's real transition
 *   (WAITING_PAYMENT/WAIT_PROOF -> ON_REVIEW) DELIBERATELY sets paymentTimerPaused: true and
 *   expiresAt: null in the same update that sets the new status - i.e. the code itself declares
 *   "the payment-window timer no longer applies, this booking is still held, under a different
 *   timer" (proofReviewDeadlineAt, a 5-minute owner-review window, not currently consulted by
 *   availability - releasing this booking the moment a guest's receipt is submitted, while the
 *   owner is actively reviewing it, would let a second guest take the room out from under a
 *   guest who already sent real money. ON_REVIEW is a continuation of the same hold, not a new
 *   independent status decision.
 *
 * WAIT_PROOF and PENDING_OWNER were explicitly NOT included: neither is ever assigned by any
 * current write path (confirmed empirically - zero rows of either status exist, and no `data:
 * { status: ... }` write anywhere in src/ sets either one). WAIT_PROOF is a legacy alias
 * normalized to WAITING_PAYMENT by src/lib/domain/booking.ts; PENDING_OWNER belongs to a
 * different, currently-dormant pay-at-check-in lifecycle referenced only by read-side KPI/
 * notification queries, never written. Including either would be extending policy the current
 * app cannot actually exercise - not proven, not added.
 */
export const ACTIVE_HOLD_STATUSES = [BOOKING_STATUS.WAITING_PAYMENT, BOOKING_STATUS.ON_REVIEW] as const;

export const OCCUPYING_OFFLINE_STATUSES = [OFFLINE_STATUS.CONFIRMED, OFFLINE_STATUS.CHECKED_IN] as const;

export const PENDING_OFFLINE_STATUSES = [OFFLINE_STATUS.PENDING] as const;

/** @deprecated Use OCCUPYING_ONLINE_STATUSES — kept for imports that expected broad blocking */
export const BLOCKING_ONLINE_STATUSES = OCCUPYING_ONLINE_STATUSES;

export const BLOCKING_OFFLINE_STATUSES = OCCUPYING_OFFLINE_STATUSES;

const CALENDAR_ONLINE_STATUSES = [...OCCUPYING_ONLINE_STATUSES, ...PENDING_ONLINE_STATUSES] as const;

function normalizeDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

/** Hotel rule: night of checkIn is occupied; checkOut morning is free — [checkIn, checkOut) */
export function bookingOccupiesDay(checkIn: Date, checkOut: Date, day: Date): boolean {
  const dayStart = normalizeDateOnly(day);
  const dayEnd = addDays(dayStart, 1);
  const bIn = normalizeDateOnly(checkIn);
  const bOut = normalizeDateOnly(checkOut);
  return bIn.getTime() < dayEnd.getTime() && bOut.getTime() > dayStart.getTime();
}

export function datesOverlap(aIn: Date, aOut: Date, bIn: Date, bOut: Date): boolean {
  return aIn.getTime() < bOut.getTime() && aOut.getTime() > bIn.getTime();
}

export function isOccupyingOnlineStatus(status: string): boolean {
  return (OCCUPYING_ONLINE_STATUSES as readonly string[]).includes(status);
}

export function isPendingOnlineStatus(status: string): boolean {
  return (PENDING_ONLINE_STATUSES as readonly string[]).includes(status);
}

export function isOccupyingOfflineStatus(offlineStatus: string | null | undefined): boolean {
  if (!offlineStatus) return false;
  return (OCCUPYING_OFFLINE_STATUSES as readonly string[]).includes(offlineStatus);
}

export function isPendingOfflineStatus(offlineStatus: string | null | undefined): boolean {
  if (!offlineStatus) return false;
  return (PENDING_OFFLINE_STATUSES as readonly string[]).includes(offlineStatus);
}

export async function getBlockedDatesInRange(roomId: number, from: Date, to: Date): Promise<Date[]> {
  const overrides = await prisma.roomDateOverride.findMany({
    where: {
      roomId,
      isBlocked: true,
      date: { gte: from, lt: to }
    },
    select: { date: true }
  });
  return overrides.map((o) => normalizeDateOnly(o.date));
}

export async function getRoomBookingsInRange(roomId: number, from: Date, to: Date, client: DbClient = prisma) {
  return client.booking.findMany({
    where: {
      roomId,
      checkIn: { lt: to },
      checkOut: { gt: from },
      OR: [
        {
          source: BOOKING_SOURCE.PLATFORM,
          status: { in: [...CALENDAR_ONLINE_STATUSES] }
        },
        {
          source: { in: [BOOKING_SOURCE.OWNER_MANUAL, BOOKING_SOURCE.MANAGER_MANUAL] },
          offlineStatus: { in: [...OCCUPYING_OFFLINE_STATUSES, ...PENDING_OFFLINE_STATUSES] }
        }
      ]
    },
    select: {
      id: true,
      source: true,
      status: true,
      offlineStatus: true,
      checkIn: true,
      checkOut: true,
      guestName: true,
      guestPhone: true,
      publicCode: true,
      phone: true,
      totalPrice: true,
      expiresAt: true,
      paymentTimerPaused: true,
      user: { select: { name: true, phone: true } }
    },
    orderBy: { checkIn: "asc" }
  });
}

/** See activeHoldCondition's doc comment - the same time-based (not cron-dependent) rule, as a
 *  plain predicate for callers that already have the booking's fields in hand (e.g. inventory.ts,
 *  which fetches via getRoomBookingsInRange and needs to combine this with per-room grouping). */
export function isActiveHoldBooking(b: { status: string; expiresAt: Date | null; paymentTimerPaused: boolean }): boolean {
  if (!(ACTIVE_HOLD_STATUSES as readonly string[]).includes(b.status)) return false;
  if (b.paymentTimerPaused) return true;
  if (!b.expiresAt) return true;
  return b.expiresAt.getTime() > Date.now();
}

export class DatesUnavailableError extends Error {
  constructor(message = "Requested dates are unavailable") {
    super(message);
    this.name = "DatesUnavailableError";
  }
}

/**
 * The DB-level backstop against double-booking a physical room: a Postgres EXCLUDE constraint
 * (`booking_room_no_overlap`, see migration 20260913080000) on
 * `COALESCE("assignedRoomId","roomId") + tsrange(checkIn,checkOut,'[)')`, scoped to occupying
 * statuses only. `assertDatesAvailable` above is still the first line of defense (avoids the
 * common case ever reaching the DB), but it is a plain SELECT-then-write and is NOT atomic on its
 * own - two concurrent requests can both pass it. The constraint is what actually prevents the
 * conflicting row from ever being committed, regardless of the SELECT's outcome.
 *
 * Under real concurrent load this constraint surfaces as one of two distinct Postgres errors, and
 * both must be treated as the same domain-level conflict:
 * - `23P01` (exclusion_violation) - the clean case: the losing statement is rejected outright.
 * - `40P01` (deadlock_detected) - under concurrent UPDATEs (e.g. two owners confirming different
 *   bookings for the same room at the same instant), Postgres can detect a lock-ordering deadlock
 *   on the GiST index before either statement reaches the exclusion check itself; one of the two
 *   transactions is killed by Postgres's deadlock resolver. This is NOT a transient/retriable
 *   "try again and it'll probably work" situation in the way a serialization failure is - the
 *   killed transaction's own write is simply gone, so retrying it re-runs the real availability
 *   check from scratch and gets a truthful answer (proven via a real concurrent test, see the
 *   Block 2 report - this is not a theoretical concern, it was observed live).
 * Confirmed empirically: neither error ever allows two conflicting rows to both commit - proven by
 * a real concurrent-write test (see Block 2 report), not assumed from reading the constraint SQL.
 */
function isRoomOverlapConstraintViolation(error: unknown): boolean {
  const msg = String((error as { message?: unknown })?.message ?? error ?? "");
  return /23P01|40P01|exclusion|deadlock/i.test(msg);
}

/**
 * Runs `fn` (a function that performs the actual availability-check-then-write for a specific
 * physical room) with the DB constraint as the real backstop. A `40P01` deadlock is retried a
 * bounded number of times (the killed transaction's write never happened, so re-running from
 * scratch is safe and correct); a `23P01` exclusion violation is a genuine conflict and is
 * translated to `DatesUnavailableError` immediately, no retry - retrying a real conflict would
 * just waste a round-trip confirming the same "no" again.
 */
export async function withRoomOverlapGuard<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRoomOverlapConstraintViolation(error)) throw error;
      lastError = error;
      const msg = String((error as { message?: unknown })?.message ?? "");
      const isDeadlock = /40P01|deadlock/i.test(msg);
      if (isDeadlock && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 25 * attempt));
        continue;
      }
      throw new DatesUnavailableError();
    }
  }
  throw lastError instanceof Error ? lastError : new DatesUnavailableError();
}

/**
 * An "active hold" - an ACTIVE_HOLD_STATUSES booking (WAITING_PAYMENT/ON_REVIEW only - see that
 * constant's doc comment for exactly why, and why WAIT_PROOF/PENDING_OWNER are excluded) that has
 * not yet timed out. Time-based, not status-based: a booking whose expiresAt has already passed
 * is treated as free here immediately, WITHOUT waiting for the /api/jobs/expire-bookings cron to
 * flip its status to EXPIRED - that job's own delay (or outage) must never let a stale hold keep
 * blocking real availability. paymentTimerPaused bookings never expire on their own (set only by
 * the real proof-submission transition, see ACTIVE_HOLD_STATUSES), so they stay held.
 */
function activeHoldCondition(now: Date) {
  return {
    status: { in: [...ACTIVE_HOLD_STATUSES] },
    OR: [{ paymentTimerPaused: true }, { expiresAt: null }, { expiresAt: { gt: now } }]
  };
}

export async function assertDatesAvailable(params: {
  roomId: number;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId?: number;
  client?: DbClient;
  /** Block 4.1: when true, an active (unexpired, unpaused) WAITING_PAYMENT/WAIT_PROOF/ON_REVIEW/
   *  PENDING_OWNER booking counts as occupying too, not just CONFIRMED/CHECKED_IN/COMPLETED.
   *  Defaults to false - CONFIRMATION's own pre-check must NOT enable this, or two holds that
   *  legitimately coexist (exactly the race this Block closes at creation) would each see the
   *  other as blocking and neither could ever be confirmed - a self-deadlock. Only booking
   *  CREATION opts in, since that's the one path meant to stop new holds from stacking up. */
  includeActiveHolds?: boolean;
}): Promise<void> {
  const { roomId, checkIn, checkOut, excludeBookingId, client = prisma, includeActiveHolds = false } = params;
  if (checkOut.getTime() <= checkIn.getTime()) {
    throw new DatesUnavailableError("Invalid dates");
  }

  const now = new Date();
  const overlap = await client.booking.findFirst({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      OR: [
        {
          source: BOOKING_SOURCE.PLATFORM,
          status: { in: [...OCCUPYING_ONLINE_STATUSES] }
        },
        {
          source: { in: [BOOKING_SOURCE.OWNER_MANUAL, BOOKING_SOURCE.MANAGER_MANUAL] },
          offlineStatus: { in: [...OCCUPYING_OFFLINE_STATUSES] }
        },
        ...(includeActiveHolds
          ? [
              {
                source: BOOKING_SOURCE.PLATFORM,
                ...activeHoldCondition(now)
              },
              {
                source: { in: [BOOKING_SOURCE.OWNER_MANUAL, BOOKING_SOURCE.MANAGER_MANUAL] },
                offlineStatus: { in: [...PENDING_OFFLINE_STATUSES] }
              }
            ]
          : [])
      ]
    },
    select: { id: true }
  });
  if (overlap) throw new DatesUnavailableError();

  const nightsStart = normalizeDateOnly(checkIn);
  const nightsEnd = normalizeDateOnly(checkOut);
  const blocked = await client.roomDateOverride.findFirst({
    where: {
      roomId,
      isBlocked: true,
      date: { gte: nightsStart, lt: nightsEnd }
    },
    select: { id: true }
  });
  if (blocked) throw new DatesUnavailableError();
}

/**
 * Physical-room counterpart to withRoomTypeCapacityGuard (Block 2.1) - a transaction-scoped
 * advisory lock keyed on roomId, so booking CREATION for a physical room gets the same
 * check-and-write atomicity the EXCLUDE constraint only gives confirmed/occupying statuses.
 * Uses the two-key advisory lock form (a distinct lock namespace from the single-key form
 * withRoomTypeCapacityGuard uses for roomTypeId) so a numeric roomId can never collide with a
 * roomTypeId that happens to share the same value.
 */
export async function withRoomHoldGuard<T>(roomId: number, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2001::int, ${roomId}::int)`;
    return fn(tx);
  });
}
