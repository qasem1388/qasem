-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ar',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Backfill any existing rows before enforcing NOT NULL.
UPDATE "ContactMessage"
SET "reference" = 'CM-' || to_char("createdAt", 'YYYY') || '-' || upper(substr(md5("id"), 1, 6)),
    "updatedAt" = "createdAt"
WHERE "reference" IS NULL;

ALTER TABLE "ContactMessage" ALTER COLUMN "reference" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ar';

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'ar';

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactMessage_reference_key" ON "ContactMessage"("reference");

