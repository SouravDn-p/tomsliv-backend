/*
  Warnings:

  - You are about to drop the column `aiGeneratedScore` on the `job_applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "job_applications" DROP COLUMN "aiGeneratedScore";

-- CreateTable
CREATE TABLE "application_ai_results" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "jobFitScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "suggestedQuestions" TEXT[],
    "strengths" TEXT[],
    "areasOfImprovement" TEXT[],
    "keyTraits" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_ai_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_ai_results_applicationId_key" ON "application_ai_results"("applicationId");

-- AddForeignKey
ALTER TABLE "application_ai_results" ADD CONSTRAINT "application_ai_results_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
