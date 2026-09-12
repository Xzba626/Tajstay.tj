-- CreateTable
CREATE TABLE "HotelSubscription" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "trialStartAt" TIMESTAMP(3) NOT NULL,
    "trialEndAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPeriod" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'TJS',
    "priceSnapshot" DECIMAL(65,30) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "subscriptionMonthlyPriceTjs" DECIMAL(65,30) NOT NULL DEFAULT 99,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotelSubscription_hotelId_key" ON "HotelSubscription"("hotelId");

-- CreateIndex
CREATE INDEX "HotelSubscription_status_idx" ON "HotelSubscription"("status");

-- CreateIndex
CREATE INDEX "SubscriptionPeriod_subscriptionId_idx" ON "SubscriptionPeriod"("subscriptionId");

-- AddForeignKey
ALTER TABLE "HotelSubscription" ADD CONSTRAINT "HotelSubscription_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "HotelSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
