-- CreateTable
CREATE TABLE "AthletePayment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthletePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthletePayment_athleteId_dueDate_idx" ON "AthletePayment"("athleteId", "dueDate");

-- CreateIndex
CREATE INDEX "AthletePayment_personalId_dueDate_idx" ON "AthletePayment"("personalId", "dueDate");

-- AddForeignKey
ALTER TABLE "AthletePayment" ADD CONSTRAINT "AthletePayment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePayment" ADD CONSTRAINT "AthletePayment_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
