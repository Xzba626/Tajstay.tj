-- AlterTable
ALTER TABLE "User" ADD COLUMN "firebaseUid" TEXT,
ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- Backfill: users already marked verified keep phoneVerified for compatibility
UPDATE "User" SET "phoneVerified" = true WHERE "verified" = true;
