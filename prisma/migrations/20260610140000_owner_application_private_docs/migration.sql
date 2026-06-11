-- Owner application private document fields (idempotent)

ALTER TABLE "OwnerApplication" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN IF NOT EXISTS "inn" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN IF NOT EXISTS "passportFront" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN IF NOT EXISTS "passportBack" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN IF NOT EXISTS "selfieWithDoc" TEXT;
ALTER TABLE "OwnerApplication" ADD COLUMN IF NOT EXISTS "propertyDoc" TEXT;

CREATE TABLE IF NOT EXISTS "OwnerApplicationDocumentViewLog" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerApplicationDocumentViewLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OwnerApplicationDocumentViewLog_applicationId_idx" ON "OwnerApplicationDocumentViewLog"("applicationId");
CREATE INDEX IF NOT EXISTS "OwnerApplicationDocumentViewLog_adminId_idx" ON "OwnerApplicationDocumentViewLog"("adminId");
CREATE INDEX IF NOT EXISTS "OwnerApplicationDocumentViewLog_createdAt_idx" ON "OwnerApplicationDocumentViewLog"("createdAt");

DO $$ BEGIN
  ALTER TABLE "OwnerApplicationDocumentViewLog" ADD CONSTRAINT "OwnerApplicationDocumentViewLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OwnerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
