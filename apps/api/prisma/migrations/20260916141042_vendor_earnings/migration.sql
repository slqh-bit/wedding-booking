-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "VendorEarning" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "grossAmount" DECIMAL(12,3) NOT NULL,
    "commissionRate" DECIMAL(4,3) NOT NULL,
    "commissionAmount" DECIMAL(12,3) NOT NULL,
    "netAmount" DECIMAL(12,3) NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "VendorEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorEarning_vendorId_status_idx" ON "VendorEarning"("vendorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorEarning_vendorId_bookingId_key" ON "VendorEarning"("vendorId", "bookingId");

-- AddForeignKey
ALTER TABLE "VendorEarning" ADD CONSTRAINT "VendorEarning_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEarning" ADD CONSTRAINT "VendorEarning_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

