-- DropIndex
DROP INDEX "Training_personalId_updatedAt_idx";

-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "weeklySchedule" JSONB;
