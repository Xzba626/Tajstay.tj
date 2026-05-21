-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT,
ADD COLUMN "telegramUsername" TEXT,
ADD COLUMN "telegramPhotoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateTable
CREATE TABLE "TelegramLoginChallenge" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "telegramPhotoUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLoginChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLoginChallenge_token_key" ON "TelegramLoginChallenge"("token");

-- CreateIndex
CREATE INDEX "TelegramLoginChallenge_expiresAt_idx" ON "TelegramLoginChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "TelegramLoginChallenge_telegramId_idx" ON "TelegramLoginChallenge"("telegramId");
