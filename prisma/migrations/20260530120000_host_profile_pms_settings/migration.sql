-- AlterTable
ALTER TABLE "HostProfile" ADD COLUMN IF NOT EXISTS "pmsSettings" JSONB;
