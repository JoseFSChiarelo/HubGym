/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `PersonalProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cref]` on the table `PersonalProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "FormRequestStatus" AS ENUM ('PENDING', 'RESPONDED');

-- AlterTable
ALTER TABLE "PersonalProfile" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "cref" TEXT;

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "document" TEXT,
    "phone" TEXT,
    "cep" TEXT,
    "paymentMethod" "PaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormRequest" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" "FormRequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormResponse" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "requestId" TEXT,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_userId_key" ON "Athlete"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_document_key" ON "Athlete"("document");

-- CreateIndex
CREATE UNIQUE INDEX "FormResponse_requestId_key" ON "FormResponse"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalProfile_cpf_key" ON "PersonalProfile"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalProfile_cref_key" ON "PersonalProfile"("cref");

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FormRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
