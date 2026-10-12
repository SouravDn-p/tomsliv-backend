-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "pricePaid" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "earlyAdopterDiscountUsage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isEarlyAdopter" BOOLEAN NOT NULL DEFAULT false;
