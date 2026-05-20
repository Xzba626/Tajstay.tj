-- Room pricing: weekend rate, minimum nights, extra guest fee
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "weekendPrice" DECIMAL(65,30);
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "minNights" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "extraGuestPrice" DECIMAL(65,30);
