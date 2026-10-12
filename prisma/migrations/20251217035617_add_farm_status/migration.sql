-- CreateEnum
CREATE TYPE "FarmStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "farms" ADD COLUMN     "status" "FarmStatus" NOT NULL DEFAULT 'ACTIVE';
