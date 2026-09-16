-- OWNER BLOCK 3: hotel analytics financial truth + expenses + owner hotel audit
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "revenueRecognizedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "settlementChannel" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Booking_revenueRecognizedAt_idx" ON "Booking"("revenueRecognizedAt");
CREATE INDEX IF NOT EXISTS "Booking_settlementChannel_idx" ON "Booking"("settlementChannel");

-- Backfill recognized revenue timestamp for already-PAID bookings (best-effort).
UPDATE "Booking"
SET "revenueRecognizedAt" = COALESCE("proofReviewedAt", "createdAt")
WHERE "paymentStatus" = 'PAID' AND "revenueRecognizedAt" IS NULL;

-- Best-effort settlement channel for pay-at-check-in / ARRIVAL.
UPDATE "Booking"
SET "settlementChannel" = 'CASH'
WHERE "settlementChannel" IS NULL
  AND ("payOnArrival" = true OR "paymentMethod" = 'ARRIVAL');

CREATE TABLE IF NOT EXISTS "HotelExpense" (
  "id" SERIAL PRIMARY KEY,
  "hotelId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TJS',
  "recurrence" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelExpense_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HotelExpense_hotelId_idx" ON "HotelExpense"("hotelId");
CREATE INDEX IF NOT EXISTS "HotelExpense_hotelId_status_idx" ON "HotelExpense"("hotelId", "status");
CREATE INDEX IF NOT EXISTS "HotelExpense_hotelId_category_idx" ON "HotelExpense"("hotelId", "category");

CREATE TABLE IF NOT EXISTS "HotelExpenseVersion" (
  "id" SERIAL PRIMARY KEY,
  "expenseId" INTEGER NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "HotelExpenseVersion_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "HotelExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HotelExpenseVersion_expenseId_idx" ON "HotelExpenseVersion"("expenseId");
CREATE INDEX IF NOT EXISTS "HotelExpenseVersion_expenseId_effectiveFrom_idx" ON "HotelExpenseVersion"("expenseId", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "HotelExpenseVersion_effectiveFrom_effectiveUntil_idx" ON "HotelExpenseVersion"("effectiveFrom", "effectiveUntil");

CREATE TABLE IF NOT EXISTS "OwnerHotelAuditLog" (
  "id" SERIAL PRIMARY KEY,
  "hotelId" INTEGER NOT NULL,
  "actorUserId" INTEGER,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "beforeState" TEXT,
  "afterState" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerHotelAuditLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OwnerHotelAuditLog_hotelId_createdAt_idx" ON "OwnerHotelAuditLog"("hotelId", "createdAt");
CREATE INDEX IF NOT EXISTS "OwnerHotelAuditLog_hotelId_action_idx" ON "OwnerHotelAuditLog"("hotelId", "action");
CREATE INDEX IF NOT EXISTS "OwnerHotelAuditLog_actorUserId_idx" ON "OwnerHotelAuditLog"("actorUserId");
