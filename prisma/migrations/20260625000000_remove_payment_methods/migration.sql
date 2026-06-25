-- Drop the payment-method link from payments (also removes its FK constraint).
ALTER TABLE "payments" DROP COLUMN IF EXISTS "paymentMethodId";

-- Remove the transfers and payment_methods tables entirely.
DROP TABLE IF EXISTS "transfers" CASCADE;
DROP TABLE IF EXISTS "payment_methods" CASCADE;
