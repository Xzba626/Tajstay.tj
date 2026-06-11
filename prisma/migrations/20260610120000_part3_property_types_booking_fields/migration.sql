-- Idempotent: safe when 20260607010000_part3_booking_property_types already applied.
-- Fixes Vercel/Neon P3018 "PropertyType already exists" on preview databases.

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentApprovedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentApprovedBy" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

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

ALTER TABLE "Hotel" ADD COLUMN IF NOT EXISTS "propertyTypeId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_propertyTypeId_fkey" FOREIGN KEY ("propertyTypeId") REFERENCES "PropertyType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentApprovedBy_fkey" FOREIGN KEY ("paymentApprovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO "PropertyType" ("id", "code", "nameRu", "nameTg", "nameEn", "icon", "isActive", "sortOrder", "createdAt") VALUES
  ('pt_apartment', 'APARTMENT', 'Квартира', 'Манзил', 'Apartment', 'building-2', true, 1, CURRENT_TIMESTAMP),
  ('pt_house', 'HOUSE', 'Дом', 'Хона', 'House', 'home', true, 2, CURRENT_TIMESTAMP),
  ('pt_villa', 'VILLA', 'Вилла', 'Вилла', 'Villa', 'castle', true, 3, CURRENT_TIMESTAMP),
  ('pt_hotel', 'HOTEL', 'Отель', 'Меҳмонхона', 'Hotel', 'hotel', true, 4, CURRENT_TIMESTAMP),
  ('pt_hostel', 'HOSTEL', 'Хостел', 'Ҳостел', 'Hostel', 'bed-single', true, 5, CURRENT_TIMESTAMP),
  ('pt_guesthouse', 'GUESTHOUSE', 'Гестхаус', 'Гестхаус', 'Guesthouse', 'house', true, 6, CURRENT_TIMESTAMP),
  ('pt_sanatorium', 'SANATORIUM', 'Санаторий', 'Санаторий', 'Sanatorium', 'heart-pulse', true, 7, CURRENT_TIMESTAMP),
  ('pt_yurt', 'YURT', 'Юрта', 'Юрт', 'Yurt', 'tent', true, 8, CURRENT_TIMESTAMP),
  ('pt_eco', 'ECO', 'Эко-дом', 'Хонаи экологӣ', 'Eco house', 'leaf', true, 9, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

UPDATE "Hotel" h
SET "propertyTypeId" = pt."id"
FROM "PropertyType" pt
WHERE h."propertyTypeId" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Hotel' AND column_name = 'propertyType'
  )
  AND UPPER(COALESCE(h."propertyType", 'HOTEL')) = pt."code";

UPDATE "Hotel" SET "propertyTypeId" = 'pt_hotel'
WHERE "propertyTypeId" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Hotel' AND column_name = 'propertyType'
  )
  AND ("propertyType" = 'HOTEL' OR "propertyType" IS NULL);

UPDATE "Hotel" SET "propertyTypeId" = 'pt_hostel'
WHERE "propertyTypeId" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Hotel' AND column_name = 'propertyType'
  )
  AND "propertyType" = 'HOSTEL';

UPDATE "Hotel" SET "propertyTypeId" = 'pt_guesthouse'
WHERE "propertyTypeId" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Hotel' AND column_name = 'propertyType'
  )
  AND "propertyType" IN ('GUESTHOUSE', 'GUEST_HOUSE');

UPDATE "Hotel" SET "propertyTypeId" = 'pt_apartment'
WHERE "propertyTypeId" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Hotel' AND column_name = 'propertyType'
  )
  AND "propertyType" = 'APARTMENT';

UPDATE "Hotel" SET "propertyTypeId" = 'pt_eco'
WHERE "propertyTypeId" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Hotel' AND column_name = 'propertyType'
  )
  AND "propertyType" IN ('ECO', 'ECO_HOUSE');
