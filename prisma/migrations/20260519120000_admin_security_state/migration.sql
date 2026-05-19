-- CreateTable
CREATE TABLE "AdminSecurityState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "secretWordHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSecurityState_pkey" PRIMARY KEY ("id")
);
