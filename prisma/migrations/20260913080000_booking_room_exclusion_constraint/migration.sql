-- DB-backed invariant against double-booking a physical room: a Postgres EXCLUDE constraint that
-- rejects, at the database level, any INSERT/UPDATE that would create two "occupying" bookings on
-- the same physical room with overlapping date ranges - regardless of which application code path
-- performs the write (online payment confirmation, offline booking creation, offline status update,
-- room assignment, or any future path). This replaces "check then write" (racy) with "the database
-- itself refuses the second write" (atomic, race-proof).
--
-- Occupying room = COALESCE("assignedRoomId", "roomId") - matches the existing app-level convention
-- (see src/lib/bookings/paymentReviewActions.ts: `booking.assignedRoomId ?? booking.roomId`).
--
-- Occupying statuses mirror OCCUPYING_ONLINE_STATUSES / OCCUPYING_OFFLINE_STATUSES in
-- src/lib/booking/availability.ts exactly:
--   PLATFORM:      CONFIRMED, CHECKED_IN, COMPLETED
--   OWNER_MANUAL:  CONFIRMED, CHECKED_IN
-- Any other status (WAITING_PAYMENT, ON_REVIEW, PENDING_OWNER, WAIT_PROOF, REJECTED, CANCELLED,
-- EXPIRED, offline PENDING/CHECKED_OUT/CANCELLED) does NOT occupy inventory and is excluded from
-- this constraint entirely - matching the pre-existing, deliberate business rule that a pending/
-- unpaid booking never blocks the room, only a truly occupying one does.
--
-- Date range uses the half-open interval already used everywhere else in this codebase
-- ([checkIn, checkOut), i.e. "checkOut morning is free") via tsrange(..., '[)').
--
-- Scope: this constraint only protects bookings that already have a resolved physical room
-- (COALESCE(assignedRoomId, roomId) IS NOT NULL). A pure room-TYPE booking with no physical room
-- assigned yet has no single column to range-exclude on - that case is protected at the
-- application layer by a capacity-aware serializable transaction (see assertRoomTypeAvailable
-- call sites), not by this constraint. This is a deliberate, documented scope boundary, not an
-- oversight - see the Block 2 report for a full explanation.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_room_no_overlap
  EXCLUDE USING gist (
    COALESCE("assignedRoomId", "roomId") WITH =,
    tsrange("checkIn", "checkOut", '[)') WITH &&
  )
  WHERE (
    COALESCE("assignedRoomId", "roomId") IS NOT NULL
    AND (
      ("source" = 'PLATFORM' AND "status" IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED'))
      OR ("source" = 'OWNER_MANUAL' AND "offlineStatus" IN ('CONFIRMED', 'CHECKED_IN'))
    )
  );
