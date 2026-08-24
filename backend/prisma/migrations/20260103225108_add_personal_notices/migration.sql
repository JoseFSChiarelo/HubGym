-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "PersonalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
