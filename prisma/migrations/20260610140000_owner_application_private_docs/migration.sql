-- AlterTable
ALTER TABLE "OwnerApplication" ADD COLUMN "address" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN "inn" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN "passportFront" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN "passportBack" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN "selfieWithDoc" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN "propertyDoc" TEXT;

-- CreateTable
CREATE TABLE "OwnerApplicationDocumentViewLog" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerApplicationDocumentViewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerApplicationDocumentViewLog_applicationId_idx" ON "OwnerApplicationDocumentViewLog"("applicationId");
CREATE INDEX "OwnerApplicationDocumentViewLog_adminId_idx" ON "OwnerApplicationDocumentViewLog"("adminId");
CREATE INDEX "OwnerApplicationDocumentViewLog_createdAt_idx" ON "OwnerApplicationDocumentViewLog"("createdAt");

-- AddForeignKey
ALTER TABLE "OwnerApplicationDocumentViewLog" ADD CONSTRAINT "OwnerApplicationDocumentViewLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OwnerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
