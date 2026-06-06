-- CreateTable
CREATE TABLE "UserDeviceSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ip" TEXT,
    "city" TEXT,
    "countryCode" TEXT,
    "userAgent" TEXT,
    "systemLanguage" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserDeviceSession_userId_lastSeenAt_idx" ON "UserDeviceSession"("userId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "UserDeviceSession" ADD CONSTRAINT "UserDeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
