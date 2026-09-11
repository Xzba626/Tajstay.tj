-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "hotelPaymentMethodId" INTEGER,
ADD COLUMN     "paymentMethodSnapshot" JSONB,
ADD COLUMN     "paymentReviewNote" TEXT;

-- CreateTable
CREATE TABLE "HotelPaymentMethod" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "paymentIdentifier" TEXT NOT NULL,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelPaymentMethod_hotelId_idx" ON "HotelPaymentMethod"("hotelId");

-- CreateIndex
CREATE INDEX "HotelPaymentMethod_hotelId_isActive_idx" ON "HotelPaymentMethod"("hotelId", "isActive");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_hotelPaymentMethodId_fkey" FOREIGN KEY ("hotelPaymentMethodId") REFERENCES "HotelPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPaymentMethod" ADD CONSTRAINT "HotelPaymentMethod_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
