-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mrNumber" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_mrNumber_idx" ON "activity_logs"("mrNumber");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");
