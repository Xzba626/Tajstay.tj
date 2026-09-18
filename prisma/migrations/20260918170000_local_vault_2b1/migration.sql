-- CreateEnum
CREATE TYPE "LocalVaultDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "LocalVaultActivationCode" (
    "id" TEXT NOT NULL,
    "codeDigest" TEXT NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "createdByUserId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalVaultActivationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalVaultDeviceBinding" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "publicKeyFp" TEXT NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "status" "LocalVaultDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "platform" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "appVersion" TEXT,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedByUserId" INTEGER,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" INTEGER,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalVaultDeviceBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalVaultUsedNonce" (
    "id" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalVaultUsedNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalVaultRateBucket" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalVaultRateBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalVaultAuditEvent" (
    "id" TEXT NOT NULL,
    "hotelId" INTEGER,
    "deviceId" TEXT,
    "actorUserId" INTEGER,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalVaultAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocalVaultActivationCode_codeDigest_key" ON "LocalVaultActivationCode"("codeDigest");

-- CreateIndex
CREATE INDEX "LocalVaultActivationCode_hotelId_idx" ON "LocalVaultActivationCode"("hotelId");

-- CreateIndex
CREATE INDEX "LocalVaultActivationCode_expiresAt_idx" ON "LocalVaultActivationCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalVaultDeviceBinding_deviceId_key" ON "LocalVaultDeviceBinding"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalVaultDeviceBinding_installationId_key" ON "LocalVaultDeviceBinding"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalVaultDeviceBinding_publicKey_key" ON "LocalVaultDeviceBinding"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "LocalVaultDeviceBinding_publicKeyFp_key" ON "LocalVaultDeviceBinding"("publicKeyFp");

-- CreateIndex
CREATE INDEX "LocalVaultDeviceBinding_hotelId_status_idx" ON "LocalVaultDeviceBinding"("hotelId", "status");

-- CreateIndex
CREATE INDEX "LocalVaultDeviceBinding_lastSeenAt_idx" ON "LocalVaultDeviceBinding"("lastSeenAt");

-- CreateIndex
CREATE INDEX "LocalVaultUsedNonce_expiresAt_idx" ON "LocalVaultUsedNonce"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalVaultUsedNonce_subjectKey_nonce_key" ON "LocalVaultUsedNonce"("subjectKey", "nonce");

-- CreateIndex
CREATE INDEX "LocalVaultRateBucket_resetAt_idx" ON "LocalVaultRateBucket"("resetAt");

-- CreateIndex
CREATE INDEX "LocalVaultAuditEvent_hotelId_createdAt_idx" ON "LocalVaultAuditEvent"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalVaultAuditEvent_deviceId_createdAt_idx" ON "LocalVaultAuditEvent"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalVaultAuditEvent_action_createdAt_idx" ON "LocalVaultAuditEvent"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "LocalVaultActivationCode" ADD CONSTRAINT "LocalVaultActivationCode_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalVaultActivationCode" ADD CONSTRAINT "LocalVaultActivationCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalVaultDeviceBinding" ADD CONSTRAINT "LocalVaultDeviceBinding_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalVaultDeviceBinding" ADD CONSTRAINT "LocalVaultDeviceBinding_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalVaultDeviceBinding" ADD CONSTRAINT "LocalVaultDeviceBinding_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
