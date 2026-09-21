-- Per-hotel monotonic delivery revision + its allocator.
--
-- Why: BookingDeliveryChange.id is assigned at INSERT but becomes visible at COMMIT, so a lower
-- id can surface AFTER a higher one under concurrency — an incremental cursor over `id` could
-- permanently skip a change. `revision` is allocated by locking the hotel's HotelDeliveryCursor
-- row inside the same transaction as the Booking mutation, so concurrent mutations for one hotel
-- serialize and commit order == revision order.
--
-- ADDITIVE ONLY. BookingDeliveryChange is empty at this point (verified: 0 rows), so `revision`
-- is added NOT NULL without a backfill. The only DROP is of the index created by this feature's
-- own previous migration, now superseded. Pre-existing unrelated schema drift is NOT touched.

-- AlterTable
ALTER TABLE "BookingDeliveryChange" ADD COLUMN "revision" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "HotelDeliveryCursor" (
    "hotelId" INTEGER NOT NULL,
    "lastRevision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelDeliveryCursor_pkey" PRIMARY KEY ("hotelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingDeliveryChange_hotelId_revision_key" ON "BookingDeliveryChange"("hotelId", "revision");

-- CreateIndex
CREATE INDEX "BookingDeliveryChange_hotelId_revision_idx" ON "BookingDeliveryChange"("hotelId", "revision");

-- DropIndex (superseded by the revision-ordered index above; id ordering is no longer the cursor)
DROP INDEX IF EXISTS "BookingDeliveryChange_hotelId_id_idx";

-- AddForeignKey
ALTER TABLE "HotelDeliveryCursor" ADD CONSTRAINT "HotelDeliveryCursor_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
