-- CreateTable
CREATE TABLE "consultation_fees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consultations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "feeId" TEXT,
    "name" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultation_fees_name_key" ON "consultation_fees"("name");

-- AddForeignKey
ALTER TABLE "patient_consultations" ADD CONSTRAINT "patient_consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consultations" ADD CONSTRAINT "patient_consultations_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "consultation_fees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
