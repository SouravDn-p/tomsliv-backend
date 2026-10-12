/*
  Warnings:

  - A unique constraint covering the columns `[customCoverLetterId]` on the table `cvs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "customCoverLetterId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cvs_customCoverLetterId_key" ON "cvs"("customCoverLetterId");

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_customCoverLetterId_fkey" FOREIGN KEY ("customCoverLetterId") REFERENCES "file_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
