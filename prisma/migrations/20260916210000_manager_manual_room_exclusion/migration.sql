-- OWNER BLOCK 5: include MANAGER_MANUAL offline bookings in physical-room EXCLUDE constraint.
-- Additive semantics only — recreates the same constraint with an expanded WHERE clause.

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_room_no_overlap;

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
      OR ("source" IN ('OWNER_MANUAL', 'MANAGER_MANUAL') AND "offlineStatus" IN ('CONFIRMED', 'CHECKED_IN'))
    )
  );
