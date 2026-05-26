-- PMS foundation: RoomType, physical room fields, booking assignment

CREATE TABLE "RoomType" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(65,30) NOT NULL,
    "weekendPrice" DECIMAL(65,30),
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "extraGuestPrice" DECIMAL(65,30),
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "maxGuests" INTEGER NOT NULL,
    "bedsCount" INTEGER NOT NULL DEFAULT 1,
    "bedConfig" TEXT NOT NULL DEFAULT '[]',
    "mealPlan" TEXT NOT NULL DEFAULT 'ROOM_ONLY',
    "amenities" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomTypePhoto" (
    "id" SERIAL NOT NULL,
    "roomTypeId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomTypePhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RatePlan" (
    "id" SERIAL NOT NULL,
    "roomTypeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mealPlan" TEXT,
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priceAdjust" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelStaff" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "staffRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelStaff_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "roomTypeId" INTEGER;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "roomNumber" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "customAmenities" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "housekeepingStatus" TEXT NOT NULL DEFAULT 'CLEAN';
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "staffNote" TEXT;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "roomTypeId" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "assignedRoomId" INTEGER;
ALTER TABLE "Booking" ALTER COLUMN "roomId" DROP NOT NULL;

-- Backfill room numbers from id where missing
UPDATE "Room" SET "roomNumber" = 'R-' || "id"::text WHERE "roomNumber" IS NULL OR trim("roomNumber") = '';

-- Create default RoomType per distinct room title per hotel
INSERT INTO "RoomType" ("hotelId", "name", "basePrice", "weekendPrice", "minNights", "extraGuestPrice", "maxGuests", "amenities", "updatedAt")
SELECT DISTINCT ON (r."hotelId", r."title")
  r."hotelId",
  r."title",
  r."price",
  r."weekendPrice",
  COALESCE(r."minNights", 1),
  r."extraGuestPrice",
  r."capacity",
  r."amenities",
  CURRENT_TIMESTAMP
FROM "Room" r
ORDER BY r."hotelId", r."title", r."id";

UPDATE "Room" r
SET "roomTypeId" = rt."id"
FROM "RoomType" rt
WHERE rt."hotelId" = r."hotelId" AND rt."name" = r."title";

UPDATE "Booking" b
SET
  "roomTypeId" = r."roomTypeId",
  "assignedRoomId" = b."roomId"
FROM "Room" r
WHERE b."roomId" = r."id" AND b."roomTypeId" IS NULL;

INSERT INTO "RatePlan" ("roomTypeId", "name", "mealPlan", "isDefault")
SELECT rt.id, 'Стандартный тариф', rt."mealPlan", true FROM "RoomType" rt
WHERE NOT EXISTS (SELECT 1 FROM "RatePlan" rp WHERE rp."roomTypeId" = rt.id);

CREATE UNIQUE INDEX "RoomType_hotelId_name_key" ON "RoomType"("hotelId", "name");
CREATE INDEX "RoomType_hotelId_idx" ON "RoomType"("hotelId");
CREATE INDEX "RoomTypePhoto_roomTypeId_idx" ON "RoomTypePhoto"("roomTypeId");
CREATE INDEX "RatePlan_roomTypeId_idx" ON "RatePlan"("roomTypeId");
CREATE UNIQUE INDEX "Room_hotelId_roomNumber_key" ON "Room"("hotelId", "roomNumber");
CREATE INDEX "Room_roomTypeId_idx" ON "Room"("roomTypeId");
CREATE INDEX "Room_status_idx" ON "Room"("status");
CREATE UNIQUE INDEX "HotelStaff_hotelId_userId_key" ON "HotelStaff"("hotelId", "userId");
CREATE INDEX "HotelStaff_userId_idx" ON "HotelStaff"("userId");
CREATE INDEX "Booking_roomTypeId_checkIn_checkOut_idx" ON "Booking"("roomTypeId", "checkIn", "checkOut");
CREATE INDEX "Booking_assignedRoomId_idx" ON "Booking"("assignedRoomId");

ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomTypePhoto" ADD CONSTRAINT "RoomTypePhoto_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotelStaff" ADD CONSTRAINT "HotelStaff_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedRoomId_fkey" FOREIGN KEY ("assignedRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
