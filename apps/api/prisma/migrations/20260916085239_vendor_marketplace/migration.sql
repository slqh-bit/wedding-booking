-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ServiceOffering" ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "city" TEXT,
ADD COLUMN     "commissionRate" DECIMAL(4,3) NOT NULL DEFAULT 0.100,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "status" "VendorStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ServiceOffering_moderationStatus_idx" ON "ServiceOffering"("moderationStatus");


-- Backfill: existing offerings + platform vendor were live before moderation existed.
UPDATE "ServiceOffering" SET "moderationStatus" = 'APPROVED';
UPDATE "Vendor" SET "status" = 'APPROVED' WHERE "isPlatformOwned" = true;
