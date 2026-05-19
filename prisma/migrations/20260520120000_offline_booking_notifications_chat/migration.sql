-- Offline bookings, notification fields, chat read receipts
ALTER TABLE "Booking" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'PLATFORM';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "createdByOwnerId" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "guestCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "offlineNote" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "offlineStatus" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "prepayment" DECIMAL(65,30);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "remainingAmount" DECIMAL(65,30);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "offlinePaymentType" TEXT;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdByOwnerId_fkey"
  FOREIGN KEY ("createdByOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Booking_source_idx" ON "Booking"("source");
CREATE INDEX IF NOT EXISTS "Booking_roomId_checkIn_checkOut_status_idx" ON "Booking"("roomId", "checkIn", "checkOut", "status");

ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SENT';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "link" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "meta" TEXT;
