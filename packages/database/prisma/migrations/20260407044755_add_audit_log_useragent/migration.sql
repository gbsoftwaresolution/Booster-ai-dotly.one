-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "resource" SET DEFAULT '';
