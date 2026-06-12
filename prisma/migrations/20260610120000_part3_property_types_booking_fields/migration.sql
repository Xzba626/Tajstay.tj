-- PropertyType catalog + booking payment approval fields

CREATE TABLE "PropertyType" (
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

CREATE UNIQUE INDEX "PropertyType_code_key" ON "PropertyType"("code");

ALTER TABLE "Hotel" ADD COLUMN "propertyTypeId" TEXT;

ALTER TABLE "Booking" ADD COLUMN "paymentApprovedAt" TIMESTAMP(3),
ADD COLUMN "paymentApprovedById" INTEGER,
ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_propertyTypeId_fkey" FOREIGN KEY ("propertyTypeId") REFERENCES "PropertyType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentApprovedById_fkey" FOREIGN KEY ("paymentApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default property types
INSERT INTO "PropertyType" ("id", "code", "nameRu", "nameTg", "nameEn", "icon", "isActive", "sortOrder", "createdAt") VALUES
  ('pt_apartment', 'APARTMENT', 'Квартира', 'Манзил', 'Apartment', 'building-2', true, 1, CURRENT_TIMESTAMP),
  ('pt_house', 'HOUSE', 'Дом', 'Хона', 'House', 'home', true, 2, CURRENT_TIMESTAMP),
  ('pt_villa', 'VILLA', 'Вилла', 'Вилла', 'Villa', 'castle', true, 3, CURRENT_TIMESTAMP),
  ('pt_hotel', 'HOTEL', 'Отель', 'Меҳмонхона', 'Hotel', 'hotel', true, 4, CURRENT_TIMESTAMP),
  ('pt_hostel', 'HOSTEL', 'Хостел', 'Ҳостел', 'Hostel', 'bed-single', true, 5, CURRENT_TIMESTAMP),
  ('pt_guesthouse', 'GUESTHOUSE', 'Гестхаус', 'Гестхаус', 'Guesthouse', 'house', true, 6, CURRENT_TIMESTAMP),
  ('pt_sanatorium', 'SANATORIUM', 'Санаторий', 'Санаторий', 'Sanatorium', 'heart-pulse', true, 7, CURRENT_TIMESTAMP),
  ('pt_yurt', 'YURT', 'Юрта', 'Юрт', 'Yurt', 'tent', true, 8, CURRENT_TIMESTAMP),
  ('pt_eco', 'ECO', 'Эко-дом', 'Хонаи экологӣ', 'Eco house', 'leaf', true, 9, CURRENT_TIMESTAMP);

-- Migrate legacy Hotel.propertyType string values
UPDATE "Hotel" SET "propertyTypeId" = 'pt_hotel' WHERE "propertyType" = 'HOTEL' OR "propertyType" IS NULL;
UPDATE "Hotel" SET "propertyTypeId" = 'pt_hostel' WHERE "propertyType" = 'HOSTEL';
UPDATE "Hotel" SET "propertyTypeId" = 'pt_guesthouse' WHERE "propertyType" IN ('GUESTHOUSE', 'GUEST_HOUSE');
UPDATE "Hotel" SET "propertyTypeId" = 'pt_apartment' WHERE "propertyType" = 'APARTMENT';
UPDATE "Hotel" SET "propertyTypeId" = 'pt_eco' WHERE "propertyType" IN ('ECO', 'ECO_HOUSE');

ALTER TABLE "Hotel" DROP COLUMN "propertyType";
