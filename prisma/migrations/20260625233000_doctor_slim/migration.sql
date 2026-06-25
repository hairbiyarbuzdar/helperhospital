-- Remove specialty, qualification, and email from doctors.
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "specialty";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "qualification";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "email";
