-- Hot-path lookups: guest bookings + messages by booking
CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX IF NOT EXISTS "ChatMessage_bookingId_idx" ON "ChatMessage"("bookingId");
