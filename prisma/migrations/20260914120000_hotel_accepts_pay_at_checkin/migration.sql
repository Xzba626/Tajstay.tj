-- BLOCK 5.4B: explicit owner opt-in for guest "pay at check-in" bookings.
-- Defaults to false so every existing hotel keeps its current behavior (Pay Now only) after
-- this migration - no hotel silently starts accepting unpaid reservations.
ALTER TABLE "Hotel" ADD COLUMN "acceptsPayAtCheckIn" BOOLEAN NOT NULL DEFAULT false;
