-- Add a sequential receipt number to payments. SERIAL auto-assigns unique
-- values to existing rows.
ALTER TABLE "payments" ADD COLUMN "receiptNo" SERIAL NOT NULL;
ALTER TABLE "payments" ADD CONSTRAINT "payments_receiptNo_key" UNIQUE ("receiptNo");
