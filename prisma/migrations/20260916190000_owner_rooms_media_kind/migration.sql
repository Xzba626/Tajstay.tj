-- OWNER BLOCK 4: media kind for category/room photos (PHOTO | PANO360) + optional scene label.
-- Additive only — existing rows default to PHOTO.

ALTER TABLE "RoomTypePhoto" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'PHOTO';
ALTER TABLE "RoomTypePhoto" ADD COLUMN IF NOT EXISTS "sceneLabel" TEXT;

ALTER TABLE "RoomPhoto" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'PHOTO';
ALTER TABLE "RoomPhoto" ADD COLUMN IF NOT EXISTS "sceneLabel" TEXT;

CREATE INDEX IF NOT EXISTS "RoomTypePhoto_roomTypeId_kind_idx" ON "RoomTypePhoto"("roomTypeId", "kind");
CREATE INDEX IF NOT EXISTS "RoomPhoto_roomId_kind_idx" ON "RoomPhoto"("roomId", "kind");
