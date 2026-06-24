-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateTable
CREATE TABLE "test_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_tests" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "testId" TEXT,
    "testName" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "payment" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_catalog_name_key" ON "test_catalog"("name");

-- AddForeignKey
ALTER TABLE "patient_tests" ADD CONSTRAINT "patient_tests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tests" ADD CONSTRAINT "patient_tests_testId_fkey" FOREIGN KEY ("testId") REFERENCES "test_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
