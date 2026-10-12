-- CreateEnum
CREATE TYPE "DesiredPersonalityTrait" AS ENUM ('DETAIL_ORIENTED', 'TEAM_PLAYER', 'SELF_MOTIVATED', 'PROBLEM_SOLVER', 'ADAPTABLE', 'RELIABLE', 'PATIENT', 'PHYSICAL_STAMINA');

-- CreateEnum
CREATE TYPE "PreferredCertification" AS ENUM ('DAIRY_FARMING_CERTIFICATION', 'FIRST_AID_AND_CPR', 'TRACTOR_OPERATION_LICENSE', 'FOOD_SAFETY_CERTIFICATION', 'ANIMAL_WELFARE_CERTIFICATION');

-- CreateEnum
CREATE TYPE "NonNegotiableSkill" AS ENUM ('ABLE_TO_PERFORM_PHYSICAL_WORK', 'ABLE_FOR_EARLY_MORNING_SHIFTS', 'AVAILABLE_FOR_WEEKEND_WORK', 'VALID_DRIVER_S_LICENSE', 'LOCAL_RESIDENCY_OR_WILLING_TO_RELOCATE');

-- AlterTable
ALTER TABLE "farms" ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "website" DROP NOT NULL,
ALTER COLUMN "herdSize" DROP NOT NULL,
ALTER COLUMN "farmType" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ideal_candidates" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "minimumExperienceYears" INTEGER NOT NULL,
    "maximumExperienceYears" INTEGER NOT NULL,
    "coreSkills" TEXT[],
    "desiredPersonalityTraits" "DesiredPersonalityTrait"[],
    "preferredCertifications" "PreferredCertification"[],
    "nonNegotiableSkills" "NonNegotiableSkill"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ideal_candidates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ideal_candidates" ADD CONSTRAINT "ideal_candidates_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
