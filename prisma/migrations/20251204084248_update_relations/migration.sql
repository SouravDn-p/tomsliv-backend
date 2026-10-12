/*
  Warnings:

  - You are about to drop the column `userId` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `farms` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customCVId]` on the table `cvs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[logoId]` on the table `farms` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[jobId]` on the table `ideal_candidates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profilePictureId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[farmId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[savedCVId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `summary` to the `experiences` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cvs" DROP CONSTRAINT "cvs_userId_fkey";

-- DropForeignKey
ALTER TABLE "farms" DROP CONSTRAINT "farms_ownerId_fkey";

-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "experiences" ADD COLUMN     "summary" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "farms" DROP COLUMN "ownerId";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "farmId" TEXT,
ADD COLUMN     "savedCVId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cvs_customCVId_key" ON "cvs"("customCVId");

-- CreateIndex
CREATE UNIQUE INDEX "farms_logoId_key" ON "farms"("logoId");

-- CreateIndex
CREATE UNIQUE INDEX "ideal_candidates_jobId_key" ON "ideal_candidates"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "users_profilePictureId_key" ON "users"("profilePictureId");

-- CreateIndex
CREATE UNIQUE INDEX "users_farmId_key" ON "users"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "users_savedCVId_key" ON "users"("savedCVId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_savedCVId_fkey" FOREIGN KEY ("savedCVId") REFERENCES "cvs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
