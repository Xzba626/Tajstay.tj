-- Profile hub: split name, preferences, isolated Telegram change flow
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredCurrency" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredTheme" TEXT NOT NULL DEFAULT 'system';

UPDATE "User"
SET
  "firstName" = COALESCE(NULLIF(TRIM("firstName"), ''), NULLIF(SPLIT_PART(TRIM("name"), ' ', 1), '')),
  "lastName" = COALESCE(
    NULLIF(TRIM("lastName"), ''),
    NULLIF(TRIM(SUBSTRING(TRIM("name") FROM POSITION(' ' IN TRIM("name") || ' ') + 1)), '')
  )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

CREATE TABLE IF NOT EXISTS "TelegramChangeRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "codeHash" TEXT,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "telegramFirstName" TEXT,
    "telegramPhotoUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramChangeRequest_sessionToken_key" ON "TelegramChangeRequest"("sessionToken");
CREATE INDEX IF NOT EXISTS "TelegramChangeRequest_userId_usedAt_idx" ON "TelegramChangeRequest"("userId", "usedAt");
CREATE INDEX IF NOT EXISTS "TelegramChangeRequest_telegramId_idx" ON "TelegramChangeRequest"("telegramId");
CREATE INDEX IF NOT EXISTS "TelegramChangeRequest_expiresAt_idx" ON "TelegramChangeRequest"("expiresAt");

ALTER TABLE "TelegramChangeRequest" DROP CONSTRAINT IF EXISTS "TelegramChangeRequest_userId_fkey";
ALTER TABLE "TelegramChangeRequest" ADD CONSTRAINT "TelegramChangeRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramLoginChallenge" DROP COLUMN IF EXISTS "linkUserId";
