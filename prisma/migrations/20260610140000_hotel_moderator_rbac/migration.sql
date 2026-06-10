-- CreateTable
CREATE TABLE "HotelModerator" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelModerator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelModerator_userId_idx" ON "HotelModerator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelModerator_hotelId_userId_key" ON "HotelModerator"("hotelId", "userId");

-- AddForeignKey
ALTER TABLE "HotelModerator" ADD CONSTRAINT "HotelModerator_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelModerator" ADD CONSTRAINT "HotelModerator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelModerator" ADD CONSTRAINT "HotelModerator_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
