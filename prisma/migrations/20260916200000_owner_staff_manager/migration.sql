-- OWNER BLOCK 5: hotel staff access lifecycle for Manager role.
-- Additive only. Existing HotelStaff rows remain; status defaults ACTIVE.

ALTER TABLE "HotelStaff" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "HotelStaff" ADD COLUMN IF NOT EXISTS "inviteTokenHash" TEXT;
ALTER TABLE "HotelStaff" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP(3);
ALTER TABLE "HotelStaff" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HotelStaff" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "HotelStaff" ADD COLUMN IF NOT EXISTS "createdByUserId" INTEGER;
ALTER TABLE "HotelStaff" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "HotelStaff_hotelId_status_idx" ON "HotelStaff"("hotelId", "status");
CREATE INDEX IF NOT EXISTS "HotelStaff_inviteTokenHash_idx" ON "HotelStaff"("inviteTokenHash");
