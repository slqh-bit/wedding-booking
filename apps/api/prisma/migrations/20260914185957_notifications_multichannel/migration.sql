-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'TELEGRAM';

-- DropIndex
DROP INDEX "Notification_bookingId_type_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_bookingId_type_channel_key" ON "Notification"("bookingId", "type", "channel");

