-- AlterTable Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentApprovedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentApprovedBy" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- CreateTable PropertyType
CREATE TABLE IF NOT EXISTS "PropertyType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameTg" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PropertyType_code_key" ON "PropertyType"("code");

-- AlterTable Hotel
ALTER TABLE "Hotel" ADD COLUMN IF NOT EXISTS "propertyTypeId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_propertyTypeId_fkey" FOREIGN KEY ("propertyTypeId") REFERENCES "PropertyType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Seed default property types
INSERT INTO "PropertyType" ("id", "code", "nameRu", "nameTg", "nameEn", "icon", "sortOrder")
VALUES
  ('pt_apartment', 'APARTMENT', 'Квартира', 'Манзил', 'Apartment', 'building-2', 1),
  ('pt_house', 'HOUSE', 'Дом', 'Хона', 'House', 'home', 2),
  ('pt_villa', 'VILLA', 'Вилла', 'Вилла', 'Villa', 'castle', 3),
  ('pt_hotel', 'HOTEL', 'Отель', 'Меҳмонхона', 'Hotel', 'hotel', 4),
  ('pt_hostel', 'HOSTEL', 'Хостел', 'Ҳостел', 'Hostel', 'bed-single', 5),
  ('pt_guesthouse', 'GUESTHOUSE', 'Гестхаус', 'Гестхаус', 'Guesthouse', 'house', 6),
  ('pt_sanatorium', 'SANATORIUM', 'Санаторий', 'Санаторий', 'Sanatorium', 'heart-pulse', 7),
  ('pt_yurt', 'YURT', 'Юрта', 'Юрт', 'Yurt', 'tent', 8),
  ('pt_eco', 'ECO', 'Эко-дом', 'Эко-хона', 'Eco house', 'trees', 9)
ON CONFLICT ("code") DO NOTHING;

UPDATE "Hotel" h
SET "propertyTypeId" = pt."id"
FROM "PropertyType" pt
WHERE h."propertyTypeId" IS NULL AND UPPER(h."propertyType") = pt."code";
