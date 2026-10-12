/*
  Warnings:

  - You are about to drop the column `certifications` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `machineryExperience` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `requiredSkills` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `salaryEnd` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `salaryStart` on the `jobs` table. All the data in the column will be lost.
  - Added the required column `farmSize` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `herdSize` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hourType` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hoursPerWeek` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `onFarmStaff` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positionStartDate` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remunerationPaidBy` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remunerationType` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roster` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PrimaryLocation" AS ENUM ('SINGLE_FARM', 'MULTI_FARM', 'CORPORATE_FARM');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "HourType" AS ENUM ('week', 'season', 'negotiable');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'FIXED_TERM';

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "certifications",
DROP COLUMN "machineryExperience",
DROP COLUMN "requiredSkills",
DROP COLUMN "salaryEnd",
DROP COLUMN "salaryStart",
ADD COLUMN     "farmSize" INTEGER NOT NULL,
ADD COLUMN     "herdSize" INTEGER NOT NULL,
ADD COLUMN     "hourType" "HourType" NOT NULL,
ADD COLUMN     "hoursPerWeek" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "onFarmStaff" INTEGER NOT NULL,
ADD COLUMN     "perKgMSDollarValue" DOUBLE PRECISION,
ADD COLUMN     "percentageOfMilkCheque" DOUBLE PRECISION,
ADD COLUMN     "positionStartDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "remunerationEnd" DOUBLE PRECISION,
ADD COLUMN     "remunerationPaidBy" TEXT NOT NULL,
ADD COLUMN     "remunerationStart" DOUBLE PRECISION,
ADD COLUMN     "remunerationType" "SalaryType" NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "roster" TEXT NOT NULL,
ADD COLUMN     "totalPackageValue" DOUBLE PRECISION,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "benefits" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL;
