-- Local Vault booking delivery change log.
--
-- ADDITIVE ONLY. Hand-written rather than generated, because `prisma migrate diff` against this
-- database also emitted pre-existing drift unrelated to this feature — including
-- `ALTER TABLE "PushSubscription" DROP COLUMN "updatedAt"` (data loss), a dropped Booking FK and
-- two dropped defaults. Those are deliberately NOT included here; this migration adds one table,
-- its indexes and its foreign keys, and nothing else.

-- CreateTable
CREATE TABLE "BookingDeliveryChange" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingDeliveryChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingDeliveryChange_hotelId_id_idx" ON "BookingDeliveryChange"("hotelId", "id");

-- CreateIndex
CREATE INDEX "BookingDeliveryChange_bookingId_idx" ON "BookingDeliveryChange"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingDeliveryChange" ADD CONSTRAINT "BookingDeliveryChange_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDeliveryChange" ADD CONSTRAINT "BookingDeliveryChange_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
