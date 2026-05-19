-- CreateTable
CREATE TABLE "SiteContentState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerPaymentMethod" (
    "ownerId" INTEGER NOT NULL,
    "methods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerPaymentMethod_pkey" PRIMARY KEY ("ownerId")
);

-- AddForeignKey
ALTER TABLE "OwnerPaymentMethod" ADD CONSTRAINT "OwnerPaymentMethod_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
