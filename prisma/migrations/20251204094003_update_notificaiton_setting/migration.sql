/*
  Warnings:

  - You are about to drop the column `userId` on the `notification_settings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[notificationSettingsId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "notification_settings" DROP CONSTRAINT "notification_settings_userId_fkey";

-- DropIndex
DROP INDEX "notification_settings_userId_key";

-- AlterTable
ALTER TABLE "notification_settings" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationSettingsId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_notificationSettingsId_key" ON "users"("notificationSettingsId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_notificationSettingsId_fkey" FOREIGN KEY ("notificationSettingsId") REFERENCES "notification_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
