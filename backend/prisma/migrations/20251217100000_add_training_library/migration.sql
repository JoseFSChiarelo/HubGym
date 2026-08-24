-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "athleteId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "exercises" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Training_personalId_updatedAt_idx" ON "Training"("personalId", "updatedAt");

