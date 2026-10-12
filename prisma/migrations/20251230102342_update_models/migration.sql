/*
  Warnings:

  - You are about to drop the column `maximumExperienceYears` on the `ideal_candidates` table. All the data in the column will be lost.
  - You are about to drop the column `hourType` on the `jobs` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'CASUAL';

-- AlterTable
ALTER TABLE "ideal_candidates" DROP COLUMN "maximumExperienceYears";

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "hourType";
