/*
  Warnings:

  - You are about to drop the column `preferredCertifications` on the `ideal_candidates` table. All the data in the column will be lost.
  - The `nonNegotiableSkills` column on the `ideal_candidates` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'HONESTY';
ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'LOYALTY';
ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'HARD_WORKING';
ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'COMMITTED';
ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'RESILIENT';
ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'POSITIVE_ATTITUDE';
ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'INITIATIVE';
ALTER TYPE "DesiredPersonalityTrait" ADD VALUE 'PUNCTUAL';

-- AlterTable
ALTER TABLE "ideal_candidates" DROP COLUMN "preferredCertifications",
ADD COLUMN     "recruiterHobbies" TEXT[],
ADD COLUMN     "recruiterPassions" TEXT[],
ADD COLUMN     "recruiterValues" TEXT[],
DROP COLUMN "nonNegotiableSkills",
ADD COLUMN     "nonNegotiableSkills" TEXT[];

-- DropEnum
DROP TYPE "NonNegotiableSkill";

-- DropEnum
DROP TYPE "PreferredCertification";
