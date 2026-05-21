-- AlterTable
ALTER TABLE "TelegramLoginChallenge" ADD COLUMN "phone" TEXT;
ALTER TABLE "TelegramLoginChallenge" ADD COLUMN "telegramFirstName" TEXT;
ALTER TABLE "TelegramLoginChallenge" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TelegramLoginChallenge" ADD COLUMN "lastCodeSentAt" TIMESTAMP(3);
ALTER TABLE "TelegramLoginChallenge" ADD COLUMN "verifiedAt" TIMESTAMP(3);

ALTER TABLE "TelegramLoginChallenge" DROP COLUMN IF EXISTS "confirmedAt";
