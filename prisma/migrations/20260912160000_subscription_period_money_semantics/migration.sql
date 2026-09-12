-- Separate "what the tariff was" from "what is actually owed/paid" so a FREE trial period can
-- never be misread as revenue by a later query that just sums the price snapshot.
ALTER TABLE "SubscriptionPeriod" RENAME COLUMN "priceSnapshot" TO "tariffSnapshot";
ALTER TABLE "SubscriptionPeriod" ADD COLUMN "amountDue" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionPeriod" ADD COLUMN "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Backfill existing rows: a PAID period owes and has paid its snapshot amount; FREE/PENDING owe
-- and have paid nothing (defaults already cover this, this is just explicit for clarity).
UPDATE "SubscriptionPeriod" SET "amountDue" = "tariffSnapshot", "amountPaid" = "tariffSnapshot" WHERE "status" = 'PAID';
